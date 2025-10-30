import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from twilio.rest import Client
from auth_routes import get_current_user_id

# (Your imports...)
load_dotenv()
DB_URL = os.getenv("DB_URL_STANDARD")
if not DB_URL:
    raise RuntimeError("DB_URL_STANDARD not set in .env file")

router = APIRouter()

class FeedbackRequest(BaseModel):
    question: str

# --- (Copied helper functions: get_db_connection, get_username_from_db, send_sms) ---
def get_db_connection():
    try:
        return psycopg2.connect(DB_URL)
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error.")

def get_username_from_db(user_id: str) -> str:
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        if row:
            return row[0]
        return "Unknown User"
    except Exception as e:
        print(f"⚠️ Failed to fetch username: {e}")
        return "Unknown User"
    finally:
        if conn: conn.close()

def send_sms(to_number: str, message: str):
    try:
        client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        from_number = os.getenv("TWILIO_PHONE_NUMBER")
        client.messages.create(body=message, from_=from_number, to=to_number)
        print(f"✅ SMS alert sent to {to_number}: {message}")
    except Exception as e:
        print(f"⚠️ SMS alert sending failed: {e}")
# --- (End of helpers) ---


@router.post("/feedback")
async def send_feedback(request: FeedbackRequest, user_id: str = Depends(get_current_user_id)):
    query = request.question.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")

    # --- 1. Categorize message ---
    query_lower = query.lower()
    academic_keywords = ["exam", "subject", "mark", "attendance", "result", "class", "syllabus", "faculty", "assignment", "semester"]
    mess_keywords = ["mess", "food", "canteen", "meal", "dining", "menu", "lunch", "breakfast", "dinner"]
    transport_keywords = ["bus", "transport", "shuttle", "route", "timing", "stop", "vehicle", "parking"]
    electronics_keywords = ["wifi", "internet", "network", "device", "laptop", "printer", "connection"]

    target_number = "+919342236331" # Default
    category = "Academic" # Default

    if any(word in query_lower for word in mess_keywords):
        target_number = "+919025312830"
        category = "Mess"
    elif any(word in query_lower for word in transport_keywords):
        target_number = "+917339170590"
        category = "Transport"
    elif any(word in query_lower for word in electronics_keywords):
        target_number = "+919363521885"
        category = "Electronics"

    username = get_username_from_db(user_id)
    conn = None
    try:
        # --- 2. Save to Database ---
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO feedback_tickets (user_id, department, original_message, status)
            VALUES (%s, %s, %s, 'New')
            RETURNING ticket_id;
            """,
            (user_id, category, query)
        )
        new_ticket_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        
        # --- 3. Send SMS Alert (Now that it's saved) ---
        sms_message = f"📩 New Feedback Ticket #{new_ticket_id}!\nCategory: {category}\nFrom: {username}\nMessage: {query}"
        send_sms(target_number, sms_message)

        return {
            "answer": f"✅ Thank you! Your feedback has been submitted as Ticket #{new_ticket_id}."
        }
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Error saving feedback to DB: {e}")
        raise HTTPException(status_code=500, detail="Error submitting feedback.")
    finally:
        if conn: conn.close()