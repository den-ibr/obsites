from fastapi import Depends, FastAPI, Request, Response, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import os
import json
from threading import Lock
from note import Note
from telegram_user import TelegramUser

MAX_FILE_SIZE = 1 * 1024 * 1024

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
DATA_FILE = "notes.json"

os.makedirs(UPLOAD_DIR, exist_ok=True)

lock = Lock()

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            raw_notes = data.get("notes", {})
            parsed_notes = {
                k: Note(**v) for k, v in raw_notes.items()
            }
            return parsed_notes, data.get("current_id", 0)
    return {}, 0

notes, current_id = load_data()

def save_data():
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "notes": {k: v.model_dump() for k, v in notes.items()},
            "current_id": current_id
        }, f, ensure_ascii=False, indent=2)

def get_author(
    id: int = Form(...),
    first_name: str = Form(...),
    username: str = Form(...),
    auth_date: int = Form(...),
    hash: str = Form(...)
) -> TelegramUser:
    return TelegramUser(
        id=id,
        first_name=first_name,
        username=username,
        auth_date=auth_date,
        hash=hash
    )

@app.get("/")
def healthcheck():
    return {"status": "ok"}

@app.post("/upload/")
async def upload_file(file: UploadFile, title: str = Form(...), author: TelegramUser = Depends(get_author)):
    global current_id

    with lock:
        file_id = current_id
        current_id += 1
        notes[str(file_id)] = Note(title=title, author_id=author.id)
        save_data()
        filename = f"{file_id}.md"

    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
        f.write(content)

    return {"id": file_id, "title": title}

@app.get("/files/{file_id}")
async def get_file(file_id: int):
    key = str(file_id)

    if key not in notes:
        raise HTTPException(status_code=404, detail="File not found")

    filename = f"{file_id}.md"
    filepath = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    return {
        "id": file_id,
        "title": notes[key],
        "content": content
    }

@app.post("/notes")
async def get_notes(author: TelegramUser):
    result = [
        {"id": k, "title": v.title}
        for k, v in notes.items()
        if v.author_id == author.id
    ]
    return result
