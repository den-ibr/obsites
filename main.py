from fastapi import Depends, FastAPI, Request, Response, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import os
import json
from threading import Lock
from note import Note
from telegram_user import is_correct_telegram_user

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

async def get_author(request: Request) -> dict[str, str]:
    form = await request.form()
    form_data = {k: str(v) for k, v in form.items() if k not in ('title', 'file', 'content')}

    if not is_correct_telegram_user(form_data.copy()):
        raise HTTPException(status_code=403, detail=f"Invalid Telegram auth data: {form_data}")
    
    return form_data

@app.get("/")
def healthcheck():
    return {"status": "ok"}

@app.post("/upload/")
async def upload_file(
    content: str = Form(...),
    title: str = Form(...),
    author: dict = Depends(get_author)
):
    global current_id

    with lock:
        file_id = current_id
        current_id += 1
        notes[str(file_id)] = Note(title=title, author_id=int(author['id']))
        save_data()

    filename = f"{file_id}.md"
    filepath = os.path.join(UPLOAD_DIR, filename)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    with open(filepath, "wb") as f:
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
        "title": notes[key].title,
        "content": content
    }

@app.post("/notes/")
async def get_notes(author: dict = Depends(get_author)):
    user_id = int(author['id'])
    return [
        {"id": k, "title": v.title}
        for k, v in notes.items()
        if v.author_id == user_id
    ]

@app.post("/delete/{id}")
async def delete_note(id: int, author: dict = Depends(get_author)):
    key = str(id)
    if key not in notes:
        raise HTTPException(status_code=404, detail="File not found")

    del notes[key]
    return "ok"
