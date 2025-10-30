import os
import uuid
import logging
import pandas as pd
from sqlalchemy import create_engine, text
import re
import io
import fitz      # For PyMuPDF
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from langchain_postgres import PGVector
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from dotenv import load_dotenv

# --- IMPORT YOUR ADMIN SECURITY ---
from auth_routes import get_current_admin_user

# --- LOAD .ENV VARIABLES ---
load_dotenv()

# --- 1. GET CONNECTION STRINGS FROM .ENV ---
# SQLAlchemy string for LangChain/Pandas
DB_CONNECTION_STRING = os.getenv("DB_URL_SQLALCHEMY") 
SQLALCHEMY_DB_URL = os.getenv("DB_URL_SQLALCHEMY")
# Standard string for psycopg2 helper
PSYCOPG2_DB_URL = os.getenv("DB_URL_STANDARD")

# --- 2. REMOVED HARDCODED VARIABLES ---
# DB_HOST = os.getenv("DB_HOST", "localhost")  <-- DELETED
# DB_NAME = os.getenv("DB_NAME", "your_db_name") <-- DELETED
# DB_USER = os.getenv("DB_USER", "your_db_user") <-- DELETED
# DB_PASS = os.getenv("DB_PASS", "your_db_password") <-- DELETED

# --- 3. REMOVED OLD STRING BUILDERS ---
# DB_CONNECTION_STRING = f"postgresql+psycopg://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}" <-- DELETED
# SQLALCHEMY_DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}" <-- DELETED
# PSYCOPG2_DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}" <-- DELETED

# --- 4. ADDED VALIDATION ---
if not DB_CONNECTION_STRING or not SQLALCHEMY_DB_URL or not PSYCOPG2_DB_URL:
    raise RuntimeError("Database connection strings not set in .env file. Please check your .env file.")

COLLECTION_NAME = "New_embeddings" 

# --- SETUP COMPONENTS ---
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
try:
    VECTOR_DB = PGVector(
        connection=DB_CONNECTION_STRING, # This now comes from .env
        embeddings=embedding_model,
        collection_name=COLLECTION_NAME,
        pre_delete_collection=False,
    )
except Exception as e:
    print(f"Error connecting to PGVector in ingest.py: {e}")
    raise RuntimeError(e)

# --- SETUP LOGGER ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- FASTAPI ROUTER ---
router = APIRouter()

# --- HELPERS ---
def clean_column_name(col_name):
    if not isinstance(col_name, str): return str(col_name)
    name = col_name.lower()
    name = name.replace('reedemed', 'redeemed')
    name = re.sub(r'[\. ]+', '_', name)
    name = name.strip('_')
    return name

def get_db_conn_psycopg2():
    """Helper function to get a psycopg2 connection"""
    try:
        return psycopg2.connect(PSYCOPG2_DB_URL) # This now comes from .env
    except Exception as e:
        logger.error(f"Failed to connect with psycopg2: {e}")
        raise HTTPException(status_code=500, detail="Database connection error.")

# --- ROUTES (NOW SECURED) ---
@router.post("/upload/")
async def upload_file(
    file: UploadFile = File(...),
    admin_id: str = Depends(get_current_admin_user)
):
    """(This is your existing PDF upload endpoint)"""
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")
    
    try:
        os.makedirs("uploads", exist_ok=True)
        file_path = os.path.join("uploads", file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        page_documents = []
        doc_metadata = {}
        try:
            with fitz.open(file_path) as doc:
                doc_metadata = doc.metadata
                for page_num, page in enumerate(doc.pages()):
                    page_text = page.get_text()
                    if page_text.strip(): 
                        page_meta = {
                            "source": file.filename,
                            "page_number": page_num + 1,
                            "doc_title": doc_metadata.get('title', 'N/A'),
                            "doc_author": doc_metadata.get('author', 'N/A'),
                            "doc_creation_date": doc_metadata.get('creationDate', 'N/A')
                        }
                        page_documents.append(
                            Document(page_content=page_text, metadata=page_meta)
                        )
        except Exception as e:
            logger.error(f"Failed to process PDF {file.filename}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to process PDF: {e}")
        if not page_documents:
            raise HTTPException(status_code=400, detail="No readable text in PDF")
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        final_chunks = splitter.split_documents(page_documents)
        for chunk in final_chunks:
            chunk.metadata["chunk_id"] = str(uuid.uuid4())
        if final_chunks:
            VECTOR_DB.add_documents(final_chunks)
        return {
            "message": f"Uploaded {len(final_chunks)} chunks from {file.filename}",
            "document_metadata": doc_metadata
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload_rewards/")
async def upload_rewards(
    file: UploadFile = File(...),
    admin_id: str = Depends(get_current_admin_user)
):
    """(This is your new CSV upload endpoint)"""
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSVs are allowed.")
    TABLE_NAME = "student_rewards"
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), header=4, skiprows=[5])
        df = df.iloc[:, :10]
        df.columns = [clean_column_name(col) for col in df.columns]
        cols_to_clean = ['cumulative_reward_points', 'redeemed_points', 'balance_points']
        for col in cols_to_clean:
            df[col] = df[col].astype(str).str.replace(',', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=['roll_no'])
        df['roll_no'] = df['roll_no'].str.upper().str.strip()
        engine = create_engine(SQLALCHEMY_DB_URL) # This now comes from .env
        df.to_sql(TABLE_NAME, engine, if_exists='replace', index=False)
        with engine.begin() as con:
            con.execute(text(f'ALTER TABLE {TABLE_NAME} ADD PRIMARY KEY (roll_no);'))
        return {"message": f"Successfully imported {len(df)} records into '{TABLE_NAME}'."}
    except KeyError as e:
        logger.error(f"Column error in rewards CSV: {e}")
        raise HTTPException(status_code=400, detail=f"CSV file is missing a required column: {e}. Check the file headers.")
    except Exception as e:
        logger.error(f"Failed to upload rewards: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@router.post("/upload_directory/")
async def upload_directory(
    file: UploadFile = File(...),
    admin_id: str = Depends(get_current_admin_user)
):
    """(This is your new CSV upload endpoint)"""
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSVs are allowed.")
    TABLE_NAME = "student_directory"
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), header=0)
        df = df.rename(columns={
            'Mail id': 'email', 
            'Register No.': 'roll_no'
        })
        df = df[['email', 'roll_no']]
        df = df.dropna() 
        df['email'] = df['email'].str.lower().str.strip()
        df['roll_no'] = df['roll_no'].str.upper().str.strip()
        df = df[df['email'].str.contains('@')]
        df = df[df['roll_no'].str.len() > 5]
        engine = create_engine(SQLALCHEMY_DB_URL) # This now comes from .env
        df.to_sql(TABLE_NAME, engine, if_exists='replace', index=False)
        with engine.begin() as con:
            con.execute(text(f'ALTER TABLE {TABLE_NAME} ADD PRIMARY KEY (email);'))
            con.execute(text(f'ALTER TABLE {TABLE_NAME} ADD CONSTRAINT roll_no_unique UNIQUE (roll_no);'))
        return {"message": f"Successfully imported {len(df)} records into '{TABLE_NAME}'."}
    except KeyError as e:
        logger.error(f"Column error in directory CSV: {e}")
        raise HTTPException(status_code=400, detail=f"CSV file is missing 'Official Email' or 'Roll No'. Check headers.")
    except Exception as e:
        logger.error(f"Failed to upload directory: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")


@router.get("/list/")
async def list_documents(admin_id: str = Depends(get_current_admin_user)):
    """(This is your existing list endpoint)"""
    
    sql_command = """
        SELECT DISTINCT cmetadata->>'source'
        FROM langchain_pg_embedding
        WHERE collection_id = (
            SELECT uuid FROM langchain_pg_collection WHERE name = %s
        )
    """
    conn = None
    try:
        conn = get_db_conn_psycopg2()
        with conn.cursor() as curs:
            curs.execute(sql_command, (COLLECTION_NAME,))
            results = curs.fetchall() 
        filenames = sorted([row[0] for row in results if row[0]])
        return {"documents": filenames}
    except Exception as e:
        logger.error(f"Failed to list documents with SQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/search/")
async def search_documents(
    query: str,
    admin_id: str = Depends(get_current_admin_user)
):
    """(This is your existing search endpoint)"""
    try:
        results = VECTOR_DB.similarity_search(query, k=5)
        seen_content = set()
        unique_results = []
        for doc in results:
            content_preview = doc.page_content[:200] 
            if content_preview not in seen_content:
                seen_content.add(content_preview)
                unique_results.append(doc)
        return [
            {
                "source": doc.metadata.get("source"),
                "page": doc.metadata.get("page_number"),
                "title": doc.metadata.get("doc_title"),
                "preview": doc.page_content[:250],
            }
            for doc in unique_results
        ]
    except Exception as e:
        logger.error(f"Failed to search documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{filename}")
async def delete_document(
    filename: str,
    admin_id: str = Depends(get_current_admin_user)
):
    """(This is your existing delete endpoint)"""

    sql_command = """
        DELETE FROM langchain_pg_embedding
        WHERE cmetadata->>'source' = %s AND collection_id = (
            SELECT uuid FROM langchain_pg_collection WHERE name = %s
        )
    """
    conn = None
    try:
        conn = get_db_conn_psycopg2()
        with conn.cursor() as curs:
            curs.execute(sql_command, (filename, COLLECTION_NAME))
            count = curs.rowcount
            conn.commit()
        if count == 0:
            return {"message": f"No records found for '{filename}' in collection '{COLLECTION_NAME}'"}
        return {"message": f"Deleted {count} chunks for '{filename}'"}
    except Exception as e:
        logger.error(f"Failed to delete document with SQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.delete("/delete_collection/")
async def delete_collection(admin_id: str = Depends(get_current_admin_user)):
    """(This is your existing delete collection endpoint)"""
    try:
        VECTOR_DB.delete_collection()
        return {"message": f"Entire collection '{COLLECTION_NAME}' deleted successfully."}
    except Exception as e:
        logger.error(f"Failed to delete collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))