import psycopg2
from back.bd.connect import db_obsites

def insert_user(user_name):
    with db_obsites.cursor() as cursor:
        if len(cursor.fetchall()) > 0:
            return False
        cursor.execute(f"SELECT MAX(user_id) FROM users")
        last_user_id = cursor.fetchall()[0][0]
        cursor.execute(f"INSERT INTO users VALUES ({last_user_id + 1}, '{user_name}')")
        db_obsites.commit()
    return True


def insert_note(title, author_name = "anonim"):
    with db_obsites.cursor() as cursor:
        cursor.execute(f"SELECT * FROM users WHERE username = '{author_name}'")
        author_exists = cursor.fetchall()
        cursor.execute(f"SELECT * FROM notes WHERE title = '{title}'")
        note_already_exists = cursor.fetchall()
        if len(author_exists) == 0 or len(note_already_exists) != 0:
            print()
            return False

        author_id = author_exists[0][0]
        cursor.execute(f"SELECT MAX(note_id) FROM notes")
        last_note_id = cursor.fetchall()[0][0]
        cursor.execute(f"INSERT INTO notes VALUES ({last_note_id + 1}, {author_id}, '{title}')")
        db_obsites.commit()
    return True

def get_all_notes_from_author(author_name = "anonim"):
    with db_obsites.cursor() as cursor:
        cursor.execute(f"SELECT user_id FROM users WHERE username = '{author_name}'")
        user_id = cursor.fetchall()[0][0]
        cursor.execute(f"SELECT title FROM notes WHERE author_id = {user_id}")
        return [i[0] for i in cursor.fetchall()]
