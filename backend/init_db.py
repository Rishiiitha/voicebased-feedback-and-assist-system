import os
import psycopg2
from dotenv import load_dotenv

# Load .env file (DB_URL_STANDARD)
load_dotenv()

DB_URL = os.getenv("DB_URL_STANDARD")

if not DB_URL:
    print("FATAL ERROR: DB_URL_STANDARD not found in .env file.")
    print("Please check your .env file and make sure it's in the root folder.")
    exit(1)

# --- All the SQL commands to build your database ---
SQL_COMMANDS = [
    """
    -- Create the ENUM type for user roles (if it doesn't exist)
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('admin', 'parent', 'student');
        END IF;
    END$$;
    """,
    """
    -- Add new department roles (SAFE TO RUN MULTIPLE TIMES)
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'mess_staff';
    """,
    """
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'transport_staff';
    """,
    """
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'electronics_staff';
    """,
    """
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'academic_staff';
    """,
    """
    -- 1. Table for User Logins
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        picture_url TEXT,
        role user_role,
        last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        roll_no TEXT
    );
    """,
    """
    -- 2. Table for User Activity
    CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    -- 3. Table for Chat Session metadata
    CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    -- 4. Table for individual Chat Messages
    CREATE TABLE IF NOT EXISTS bot_chat_history (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
        message JSONB NOT NULL
    );
    """,
    """
    -- 5. Table for Student Rewards (from your CSV)
    CREATE TABLE IF NOT EXISTS student_rewards (
        sl_no INTEGER,
        year TEXT,
        roll_no TEXT PRIMARY KEY,
        student_name TEXT,
        course_code TEXT,
        department TEXT,
        mentor_name TEXT,
        cumulative_reward_points NUMERIC(10, 2),
        redeemed_points NUMERIC(10, 2),
        balance_points NUMERIC(10, 2)
    );
    """,
    """
    -- 6. Table for Student Directory (from your Google Sheet)
    CREATE TABLE IF NOT EXISTS student_directory (
        email TEXT PRIMARY KEY,
        roll_no TEXT NOT NULL UNIQUE
    );
    """,
    """
    -- 7. Table for Feedback Tickets
    CREATE TABLE IF NOT EXISTS feedback_tickets (
        ticket_id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        department TEXT NOT NULL,
        original_message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'New', -- 'New', 'In Progress', 'Resolved'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_message TEXT 
    );
    """,
    
    # --- Indexes (Moved to the end) ---
    """
    CREATE INDEX IF NOT EXISTS idx_users_roll_no ON users(roll_no);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_student_directory_roll_no ON student_directory(roll_no);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_feedback_tickets_department ON feedback_tickets(department, status);
    """
]

def initialize_database():
    conn = None
    try:
        print(f"Connecting to database...")
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("Starting database initialization...")
        
        for command in SQL_COMMANDS:
            try:
                cur.execute(command)
                # Get the first important line of the command for logging
                log_line = command.strip().splitlines()[0].strip()
                print(f"Successfully executed: {log_line}...")
            except psycopg2.Error as e:
                # 42P07 = duplicate_table, 42710 = duplicate_object/type
                if e.pgcode in ('42P07', '42710'):
                    log_line = command.strip().splitlines()[0].strip()
                    print(f"Skipping (already exists): {log_line}...")
                    conn.rollback() # Need to rollback to clear the error for this command
                else:
                    print(f"--- ERROR EXECUTING COMMAND ---")
                    print(command)
                    print(f"Error: {e}")
                    print(f"---------------------------------")
                    raise e
        
        conn.commit() # Commit all successful changes at the end
        cur.close()
        
        print("\n✅ Database initialization complete! All tables are ready.")

    except Exception as e:
        if conn: conn.rollback() # Rollback all changes on any error
        print(f"❌ FATAL ERROR during initialization: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    initialize_database()