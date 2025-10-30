import os
import psycopg2
import uuid
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnableParallel, RunnableLambda
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import PostgresChatMessageHistory
from langchain_ollama import OllamaLLM
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document
from dotenv import load_dotenv
from typing import Optional
from auth_routes import get_current_user_id

# --- Load Environment ---
load_dotenv()

# --- DB CONFIG (FIXED) ---
# Standard string for psycopg2 and PostgresChatMessageHistory
DB_CONNECTION_STRING = os.getenv("DB_URL_STANDARD") 
# SQLAlchemy string for PGVector
DB_URL_SQLALCHEMY = os.getenv("DB_URL_SQLALCHEMY")

if not DB_CONNECTION_STRING or not DB_URL_SQLALCHEMY:
    raise RuntimeError("Database connection strings (DB_URL_STANDARD, DB_URL_SQLALCHEMY) not set in .env file")
# --- End of Config ---

# --- LangChain Setup ---
llm = OllamaLLM(model="llama3.1")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# --- PGVector: RAG Docs (FIXED) ---
COLLECTION_NAME_DOCS = "New_embeddings"
doc_store = PGVector(
    connection=DB_URL_SQLALCHEMY,  # <-- Uses correct string
    collection_name=COLLECTION_NAME_DOCS, 
    embeddings=embeddings
)
doc_retriever = doc_store.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# --- PGVector: User Preferences (FIXED) ---
COLLECTION_NAME_PREFS = "user_preferences"
preference_store = PGVector(
    connection=DB_URL_SQLALCHEMY, # <-- Uses correct string
    collection_name=COLLECTION_NAME_PREFS, 
    embeddings=embeddings
)
preference_retriever = preference_store.as_retriever(search_type="similarity", search_kwargs={"k": 2})

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# --- Summarizer Chain ---
summarizer_prompt = ChatPromptTemplate.from_messages([
    MessagesPlaceholder(variable_name="chat_history"),
    ("user", "Summarize the conversation focusing on user questions and preferences. If none, say 'No summary yet'.")
])
summarization_chain = summarizer_prompt | llm | StrOutputParser()

# --- Preference Extractor ---
class Preference(BaseModel):
    fact: Optional[str] = Field(description="A single fact or preference learned about the user.")
extractor_parser = JsonOutputParser(pydantic_object=Preference)
extractor_prompt = ChatPromptTemplate.from_template(
    "Analyze:\nUser: {question}\nAI: {answer}\nIf a new permanent fact or preference is learned, output it. Else null.\n{format_instructions}"
)
preference_extraction_chain = extractor_prompt | llm | extractor_parser

# --- RAG Template (Stricter) ---
rag_template = """
You are a strict AI assistant for college-related queries.
User Preferences:
{preferences}
Chat Summary:
{summarized_history}
Context (from documents):
{context}
Rules:
1. If the answer is NOT found clearly in the context, summary, or preferences — reply exactly:
   "I'm sorry, I don't have that information."
2. Do NOT assume or guess.
3. Keep your answer concise and factual.
4. Use only the data from the provided context.
Question:
{question}
Answer:
"""
prompt = ChatPromptTemplate.from_template(rag_template)

# --- Retrieve User Preferences ---
def retrieve_and_format_preferences(input_dict):
    user_id = input_dict['user_id']
    question = input_dict['question']
    user_pref_retriever = preference_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 2},
        filter={"user_id": user_id}
    )
    docs = user_pref_retriever.invoke(question)
    return format_docs(docs)

# --- Core RAG Chain ---
rag_chain_core = (
    RunnableParallel(
        context=(RunnableLambda(lambda x: x['question']) | doc_retriever | format_docs),
        preferences=RunnableLambda(retrieve_and_format_preferences),
        summarized_history=(RunnableLambda(lambda x: {"chat_history": x['history']}) | summarization_chain),
        question=RunnableLambda(lambda x: x['question'])
    )
    | prompt
    | llm
    | StrOutputParser()
)

# --- Chat History in Postgres (FIXED) ---
# This function is now the factory for the session history
def get_session_history(session_id: str):
    return PostgresChatMessageHistory(
        connection_string=DB_CONNECTION_STRING, # Uses standard .env string
        session_id=session_id,
        table_name="bot_chat_history" # Connects to your new table
    )

# --- Helper: Fetch username from DB (FIXED) ---
def get_username_from_db(user_id: str) -> str:
    try:
        # Connects using the standard .env string
        conn = psycopg2.connect(DB_CONNECTION_STRING) 
        cur = conn.cursor()
        cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return row[0]
        return "Unknown User"
    except Exception as e:
        print(f"⚠️ Failed to fetch username: {e}")
        return "Unknown User"

# --- Wrap Chain with Memory ---
chain_with_chat_history = RunnableWithMessageHistory(
    rag_chain_core,
    get_session_history, # This is now the session factory
    input_messages_key="question",
    history_messages_key="history",
    input_keys=["question", "user_id"]
)

# --- FastAPI Router ---
router = APIRouter()

# --- Request Model (FIXED) ---
class QueryRequest(BaseModel):
    question: str
    session_id: Optional[str] = None # Now accepts a session_id

# --- Helper: DB Connection for API endpoints ---
def get_db_conn_for_api():
    try:
        return psycopg2.connect(DB_CONNECTION_STRING)
    except Exception as e:
        print(f"API DB Connection Error: {e}")
        return None

# --- Main /ask Endpoint (FIXED for Session Management) ---
@router.post("/ask")
async def ask_question(request: QueryRequest, user_id: str = Depends(get_current_user_id)):
    query = request.question.strip()
    session_id = request.session_id
    new_session_id = None # Flag to return to frontend
    
    if not query:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    conn = None
    try:
        username = get_username_from_db(user_id)
        print(f"🟢 User '{username}' asked: {query}")
        
        conn = get_db_conn_for_api()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection error")
        
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # --- Session Creation Logic (FIXED) ---
        if not session_id:
            # This is a new chat
            new_session_id = str(uuid.uuid4())
            session_id = new_session_id 
            
            title = query[:50] + "..." if len(query) > 50 else query
            
            cur.execute(
                "INSERT INTO chat_sessions (session_id, user_id, title) VALUES (%s, %s, %s)",
                (session_id, user_id, title)
            )
            conn.commit() # This commit fixes the ForeignKeyViolation
        else:
            # This is an existing chat. Verify the user owns this session.
            cur.execute(
                "SELECT * FROM chat_sessions WHERE session_id = %s AND user_id = %s",
                (session_id, user_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized for this session")
        # --- End of Session Logic ---

        # --- RAG Chain Query (FIXED) ---
        # We now pass the correct session_id to the config
        answer = chain_with_chat_history.invoke(
            {"question": query, "user_id": user_id},
            config={"configurable": {"session_id": session_id}} 
        ).strip()

        # --- Preference Extraction (Copied from your file) ---
        try:
            preference_result = preference_extraction_chain.invoke({
                "question": query, "answer": answer,
                "format_instructions": extractor_parser.get_format_instructions()
            })
            if preference_result and preference_result.get("fact"):
                fact = preference_result["fact"]
                pref_doc = Document(
                    page_content=fact,
                    metadata={"user_id": user_id}
                )
                preference_store.add_documents([pref_doc])
        except Exception as extraction_err:
            print(f"Error during preference extraction: {extraction_err}")
        
        # --- SMS Logic (REMOVED) ---
        # All the Twilio/SMS/Complaint logic was removed
        # because you moved it to feedback.py

        # --- Strict Missing Info Alert (REMOVED) ---
        # This was also part of the complaint logic
        if ("i'm sorry" in answer.lower() and "don't have that information" in answer.lower()):
            return {"answer": "I'm sorry, I don't have that information."}

        # --- Return (FIXED) ---
        # Return the answer AND the session_id
        return {"answer": answer, "new_session_id": new_session_id, "session_id": session_id}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()
