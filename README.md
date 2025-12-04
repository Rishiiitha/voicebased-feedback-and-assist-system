# 🎓Student Support Voicebot

## 📖 Overview.

By fusing **Retrieval-Augmented Generation (RAG)** with structured SQL queries, this system doesn't just "match keywords"—it reads uploaded PDFs, understands context, checks your grades, and learns your preferences to deliver a hyper-personalized campus experience.

![welcome](welcome_page.png)


---

## ✨Key Features

### 🧠 **RAG-Powered Intelligence**
We use **LangChain** and **Ollama** to turn your uploaded PDFs into a conversational knowledge base.
* *Query:* "What are the prerequisites for CS101?"
* *System:* Retrieves the syllabus PDF → Generates natural language answer.

### 🛡️ **Fort Knox Security**
Secure, token-based entry using **Google Sign-In (GSI)** and **JWTs**. Only authorized students get past the velvet rope.

![login](login_page.png)


### ⚡ **Vector Recall**
Powered by **PostgreSQL + `pgvector`**. We store document embeddings to find the "needle in the haystack" instantly.

### 📊 **Hybrid Data Fetching**
The bot is ambidextrous:
1.  **Unstructured:** Reads PDFs for general info.
2.  **Structured:** Queries SQL for real-time *CGPA*, *Attendance*, and *Reward Points*.
 ![User](User.png)



### 🕵️ **Preference Learning**
The bot pays attention. It automatically extracts and remembers user preferences from chat history to make every interaction smoother than the last.

![data](data_management.png)


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
GOOGLE_CLIENT_ID=Your_client_id
GOOGLE_CLIENT_SECRET=Your_client_secret_key
JWT_SECRET_KEY=Your_client_secret_key



TWILIO_ACCOUNT_SID=Your_account_SID
TWILIO_AUTH_TOKEN=Your_auth_token
TWILIO_PHONE_NUMBER=Your_twilio_phone_numner
string= postgresql://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

DB_URL_STANDARD=postgresql://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

DB_URL_SQLALCHEMY=postgresql+psycopg://neondb_owner:npg_ZvoFqbNQiA09@ep-divine-base-ah4xsw6j-pooler.c-3.us-east-1.aws.neon.tech/Knowledge_base?sslmode=require&channel_binding=require

EMAIL_ADDRESS=your_email_id
EMAIL_PASSWORD=your_password
