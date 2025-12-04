# 🎓Student Support Voicebot

## 📖 Overview.

By fusing **Retrieval-Augmented Generation (RAG)** with structured SQL queries, this system doesn't just "match keywords"—it reads uploaded PDFs, understands context, checks your grades, and learns your preferences to deliver a hyper-personalized campus experience.

![Screenshot](<img width="1920" height="1017" alt="Screenshot (602)" src="https://github.com/user-attachments/assets/4de73872-df13-49cd-8ed2-93783dd2c4bb" />
)

---

## ✨Key Features

### 🧠 **RAG-Powered Intelligence**
We use **LangChain** and **Ollama** to turn your uploaded PDFs into a conversational knowledge base.
* *Query:* "What are the prerequisites for CS101?"
* *System:* Retrieves the syllabus PDF → Generates natural language answer.

### 🛡️ **Fort Knox Security**
Secure, token-based entry using **Google Sign-In (GSI)** and **JWTs**. Only authorized students get past the velvet rope.
![Image](<img width="1581" height="740" alt="image" src="https://github.com/user-attachments/assets/a836a64b-5a3f-4e95-8c5a-7a7b5365c2ee" />)


### ⚡ **Vector Recall**
Powered by **PostgreSQL + `pgvector`**. We store document embeddings to find the "needle in the haystack" instantly.

### 📊 **Hybrid Data Fetching**
The bot is ambidextrous:
1.  **Unstructured:** Reads PDFs for general info.
2.  **Structured:** Queries SQL for real-time *CGPA*, *Attendance*, and *Reward Points*.
   ![Image](
)


### 🕵️ **Preference Learning**
The bot pays attention. It automatically extracts and remembers user preferences from chat history to make every interaction smoother than the last.

   ![Image](<img width="1600" height="756" alt="Untitled design" src="https://github.com/user-attachments/assets/a76a80e9-1c75-499a-9416-dcffd90909d5" />
)

--- ![fe25f154-ab55-4c97-9d97-6f5a5b42d1b0](https://github.com/user-attachments/assets/5f51906b-6992-4aaa-9b1e-46bb16899a9e)


## 🛠️ The Engine Room (Tech Stack)

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | `FastAPI` | High-performance API handling |
| **Brain (LLM)** | `Ollama` | Local Large Language Model execution |
| **Orchestrator** | `LangChain` | Managing the RAG pipeline |
| **Memory** | `PostgreSQL` | Storing Users, Chats, and Embeddings |
| **Embeddings** | `HuggingFace` | `all-MiniLM-L6-v2` (Text-to-Vector) |
| **Auth** | `Google OAuth2` | Identity verification |

---

## 🚀 Launch Sequence

Follow these steps to deploy the system locally.

### Phase 1: Prerequisites
* **Python 3.10+** (The language of choice)
* **PostgreSQL** (The vault)
    * *Crucial:* Run `CREATE EXTENSION vector;` in your SQL tool.
* **Ollama** (The local AI) running in the background.

### Phase 2: Installation

1.  **Clone the Base:**
    ```bash
    git clone [https://github.com/Rishiiitha/Personalised-voicebot.git](https://github.com/Rishiiitha/Personalised-voicebot.git)
    cd ris
    ```

2.  **Isolate the Environment:**
    ```bash
    python -m venv venv
    # Activate:
    source venv/bin/activate  # Mac/Linux
    venv\Scripts\activate     # Windows
    ```

3.  **Inject Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### Phase 3: Configuration (`.env`)

Create a `.env` file in the root. Fills in the blanks below:

```env
# 🗄️ Database Coordinates

TWILIO_AUTH_TOKEN=182e99e7d5ca6bbb817886cf6d3f6409
TWILIO_PHONE_NUMBER=+16209385396
string= postgresql://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

DB_URL_STANDARD=postgresql://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

DB_URL_SQLALCHEMY=postgresql+psycopg://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

EMAIL_ADDRESS=your email
EMAIL_PASSWORD=password
