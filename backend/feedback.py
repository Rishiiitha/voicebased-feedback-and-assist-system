import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from twilio.rest import Client
from auth_routes import get_current_user_id

# --- Load Environment ---
load_dotenv()

# --- DB CONFIG ---
# Get the standard connection string
DB_URL = os.getenv("DB_URL_STANDARD")
if not DB_URL:
    raise RuntimeError("DB_URL_STANDARD not set in .env file")

# --- FastAPI Router ---
router = APIRouter()

# --- Pydantic Model ---
class FeedbackRequest(BaseModel):
    question: str # We can reuse 'question' as the key

# --- Helper: DB Connection ---
def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error.")

# --- Helper: Fetch username from DB ---
def get_username_from_db(user_id: str) -> str:
    """Helper to get username, copied from api_bot.py"""
    try:
        conn = get_db_connection()
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

# --- Helper: Twilio SMS ---
def send_sms(to_number: str, message: str):
    """Helper to send SMS, copied from api_bot.py"""
    try:
        client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        from_number = os.getenv("TWILIO_PHONE_NUMBER")
        client.messages.create(body=message, from_=from_number, to=to_number)
        print(f"✅ SMS sent to {to_number}: {message}")
    except Exception as e:
        # Don't crash the app if SMS fails, just print a warning
        print(f"⚠️ SMS sending failed: {e}")


# --- Feedback Endpoint ---
@router.post("/feedback")
async def send_feedback(request: FeedbackRequest, user_id: str = Depends(get_current_user_id)):
    """Handles feedback messages — forwards via SMS only, no AI processing."""
    query = request.question.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")

    # --- Categorize message ---
    query_lower = query.lower()
    academic_keywords = ["exam", "subject", "mark", "attendance", "result", "class", "syllabus", "faculty", "assignment", "semester"]
    mess_keywords = ["mess", "food", "canteen", "meal", "dining", "menu", "lunch", "breakfast", "dinner"]
    transport_keywords = ["bus", "transport", "shuttle", "route", "timing", "stop", "vehicle", "parking"]
    electronics_keywords = ["wifi", "internet", "network", "device", "laptop", "printer", "connection"]

    target_number = None
    category = None

    if any(word in query_lower for word in academic_keywords):
        target_number = "+919342236331"
        category = "Academic Feedback"
    elif any(word in query_lower for word in mess_keywords):
        target_number = "+919025312830"
        category = "Mess Feedback"
    elif any(word in query_lower for word in transport_keywords):
        target_number = "+917339170590"
        category = "Transport Feedback"
    elif any(word in query_lower for word in electronics_keywords):
        target_number = "+919363521885"
        category = "Electronics Feedback"
    else:
        target_number = "+919342236331"
        category = "General Feedback"

    # --- Fetch username ---
    username = get_username_from_db(user_id)

    # --- Build SMS message ---
    sms_message = f"📩 New Feedback Received!\nCategory: {category}\nFrom: {username}\nMessage: {query}"

    try:
        send_sms(target_number, sms_message)
        print(f"✅ Feedback SMS sent to {target_number} ({category})")
        
        return {
            "answer": "✅ Thank you for your feedback! It has been forwarded to the concerned department."
        }

    except Exception as e:
        print(f"❌ Error sending feedback SMS: {e}")
        raise HTTPException(status_code=500, detail="Error sending feedback.")