# 🎓Student Support Voicebot

## 📖 Overview.

By fusing **Retrieval-Augmented Generation (RAG)** with structured SQL queries, this system doesn't just "match keywords"—it reads uploaded PDFs, understands context, checks your grades, and learns your preferences to deliver a hyper-personalized campus experience.

![Screenshot](<img width="1920" height="1017" alt="Screenshot (602)" src="https://github.com/user-attachments/assets/78f3f98a-c5a4-464f-a038-a4bc0f30e112" />
)

---

## ✨Key Features

### 🧠 **RAG-Powered Intelligence**
We use **LangChain** and **Ollama** to turn your uploaded PDFs into a conversational knowledge base.
* *Query:* "What are the prerequisites for CS101?"
* *System:* Retrieves the syllabus PDF → Generates natural language answer.

### 🛡️ **Fort Knox Security**
Secure, token-based entry using **Google Sign-In (GSI)** and **JWTs**. Only authorized students get past the velvet rope.
![Image](<img width="1581" height="740" alt="image" src="https://github.com/user-attachments/assets/dd3c150d-27cd-4691-8475-8513440c5ed2" />
)


### ⚡ **Vector Recall**
Powered by **PostgreSQL + `pgvector`**. We store document embeddings to find the "needle in the haystack" instantly.

### 📊 **Hybrid Data Fetching**
The bot is ambidextrous:
1.  **Unstructured:** Reads PDFs for general info.
2.  **Structured:** Queries SQL for real-time *CGPA*, *Attendance*, and *Reward Points*.
   ![Image](<img width="1600" height="756" alt="Untitled design" src="https://github.com/user-attachments/assets/441d61ef-6e8e-4bfa-a6ae-bd3d557930a2" />
)


### 🕵️ **Preference Learning**
The bot pays attention. It automatically extracts and remembers user preferences from chat history to make every interaction smoother than the last.

![Image](![fe25f154-ab55-4c97-9d97-6f5a5b42d1b0](https://github.com/user-attachments/assets/291d6ec8-676e-40ba-a85b-8f47603417a9)
)

)

---

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
GOOGLE_CLIENT_ID=579116108847-qg7v7hmhmfp098lt886t3gs3l0j25dt8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
JWT_SECRET_KEY=iamthebrilliantoneinthehallicanbethebest



TWILIO_ACCOUNT_SID=ACa2bfedb683f2edd41ace235d78fafbee
TWILIO_AUTH_TOKEN=182e99e7d5ca6bbb817886cf6d3f6409
TWILIO_PHONE_NUMBER=+16209385396
string= postgresql://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

DB_URL_STANDARD=postgresql://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

DB_URL_SQLALCHEMY=postgresql+psycopg://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

EMAIL_ADDRESS=your email
EMAIL_PASSWORD=password
