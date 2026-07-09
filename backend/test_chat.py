
import asyncio
from app.core.database import SessionLocal
from app.models.domain import Session, User
from app.services.chat_service import chat
from app.core.config import settings

async def main():
    # Need to fake a session
    db = SessionLocal()
    session_id = "309b3435-a995-4578-9122-da6e83a03fc1"
    
    try:
        res = await chat(session_id, "find top 5 price of gold\n(Generate both Pandas code and SQL query for this insight)")
        print(f"SQL: {res.sql}")
        print(f"CODE: {res.code.snippet if res.code else None}")
        print(f"ERROR: {res.execution_error}")
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(main())

