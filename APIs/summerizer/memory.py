from APIs.common.config import dbConfig
from datetime import datetime

class summarize_memory:
    def __init__(self, user_id: str = None, session_id: str = None):
        self.user_id: str = user_id
        self.session_id: str = session_id
        self.db_config = dbConfig()

    def _init_db(self):
        with self.db_config.get_connection() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notes(
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    user_notes TEXT NOT NULL,  -- SQLite uses TEXT, not LONG TEXT
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Fixed typo
                )
            """)

    def get_notes(self, user_id, session_id):
        with self.db_config.get_connection() as cursor:
            cursor.execute("""
                SELECT user_notes FROM notes WHERE user_id = ? AND session_id = ?
            """, (self.user_id, self.session_id))  
            result = cursor.fetchone()
            return result[0] if result else None

    def insert_notes(self, notes):
        with self.db_config.get_connection() as cursor:
            cursor.execute("""
                INSERT INTO notes (user_id, session_id, user_notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)  -- Added column names for clarity
            """, (self.user_id, self.session_id, notes, datetime.now(), datetime.now()))

    def update_notes(self, notes):
        with self.db_config.get_connection() as cursor:
            cursor.execute("""
                UPDATE notes SET user_notes = ?, updated_at = ?  -- Added comma
                WHERE user_id = ? AND session_id = ?
            """, (notes, datetime.now(), self.user_id, self.session_id)) 

    def delete_notes(self):
        with self.db_config.get_connection() as cursor:
            cursor.execute("""
                DELETE FROM notes  -- Added FROM
                WHERE user_id = ? AND session_id = ?
            """, (self.user_id, self.session_id))