from fastapi import FastAPI, Request, Response, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

import os
import json
from threading import Lock

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
DATA_FILE = "data.json"

os.makedirs(UPLOAD_DIR, exist_ok=True)

lock = Lock()

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("titles", {}), data.get("current_id", 0)
    return {}, 0

def save_data():
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "titles": titles,
            "current_id": current_id
        }, f, ensure_ascii=False, indent=2)

titles, current_id = load_data()


@app.post("/upload/")
async def upload_file(file: UploadFile, title: str = Form(...)):
    global current_id

    with lock:
        file_id = current_id
        current_id += 1
        titles[str(file_id)] = title
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

    if key not in titles:
        raise HTTPException(status_code=404, detail="File not found")

    filename = f"{file_id}.md"
    filepath = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    return {
        "id": file_id,
        "title": titles[key],
        "content": content
    }

app.mount("/", StaticFiles(directory="static", html=True), name="static")
