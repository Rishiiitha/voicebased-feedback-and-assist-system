import os
import psycopg2
import smtplib # For sending email
from email.message import EmailMessage
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from dotenv import load_dotenv
from auth_routes import get_current_user_payload

load_dotenv()
router = APIRouter()

# --- Email Credentials ---
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# --- DB Connection ---
DB_URL = os.getenv("DB_URL_STANDARD")
def get_db_connection():
    try:
        return psycopg2.connect(DB_URL)
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error.")

# --- Helper: Send Intimation Email ---
def send_intimation_email(to_email: str, subject: str, body: str):
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        print("⚠️ WARNING: EMAIL_ADDRESS or EMAIL_PASSWORD not set in .env. Cannot send email.")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg.set_content(body)
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        print(f"✅ Intimation email sent to {to_email}")
    except Exception as e:
        print(f"❌ Error sending email: {e}")

# --- Pydantic Models ---
class ResolveTicketRequest(BaseModel):
    ticket_id: int
    message: str # "Solved", "Will be solved", or a custom message
    status: str # 'In Progress' or 'Resolved'

# --- Department Endpoints ---
@router.get("/department/tickets")
async def get_department_tickets(payload: dict = Depends(get_current_user_payload)):
    """
    Fetches all tickets for the logged-in department's role.
    """
    role = payload.get("role")
    
    department_map = {
        'mess_staff': 'Mess',
        'transport_staff': 'Transport',
        'electronics_staff': 'Electronics',
        'academic_staff': 'Academic',
        'admin': 'admin' # Admin can see all
    }
    department = department_map.get(role)
    
    if not department:
        raise HTTPException(status_code=403, detail="You are not authorized to view tickets.")
        
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT t.*, u.email as user_email, u.name as user_name
            FROM feedback_tickets t
            LEFT JOIN users u ON t.user_id = u.id
            {where_clause}
            ORDER BY t.status ASC, t.created_at DESC
        """
        
        if department == 'admin':
            cur.execute(query.format(where_clause="")) # Admin sees all
        else:
            cur.execute(query.format(where_clause="WHERE t.department = %s"), (department,))

        tickets = cur.fetchall()
        cur.close()
        return {"tickets": tickets}
    except Exception as e:
        print(f"Error fetching tickets: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tickets.")
    finally:
        if conn: conn.close()

@router.post("/department/resolve")
async def resolve_ticket(
    request: ResolveTicketRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Resolves a ticket and sends an intimation email to the user.
    """
    role = payload.get("role")
    if "staff" not in role and role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized.")

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Update the ticket in the database
        cur.execute(
            """
            UPDATE feedback_tickets
            SET status = %s, 
                resolution_message = %s,
                resolved_at = CASE WHEN %s = 'Resolved' THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE ticket_id = %s
            RETURNING user_id, original_message;
            """,
            (request.status, request.message, request.status, request.ticket_id)
        )
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        
        user_id = result['user_id']
        original_message = result['original_message']
        
        # Get the user's email
        cur.execute("SELECT email, name FROM users WHERE id = %s", (user_id,))
        user_info = cur.fetchone()
        
        if not user_info or not user_info['email']:
            print("User has no email, cannot send intimation.")
            conn.commit()
            return {"message": "Ticket status updated, but user has no email for intimation."}
        
        conn.commit()
        cur.close()
        
        # Send the intimation email
        subject = f"Update on Your Feedback (Ticket #{request.ticket_id})"
        body = f"""
        Hello {user_info['name'] or 'User'},

        You have an update on your feedback ticket (Ticket #{request.ticket_id}).
        
        Your Original Message:
        "{original_message}"

        Message from the department:
        "{request.message}"

        New Status: {request.status}
        
        Thank you!
        """
        send_intimation_email(user_info['email'], subject, body)
        
        return {"message": "Ticket updated and intimation sent."}
        
    except Exception as e:
        if conn: conn.rollback()
        print(f"Error resolving ticket: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve ticket.")
    finally:
        if conn: conn.close()