import asyncio
import os
import uuid
from optparse import Option
from typing import Optional
from back.bd import db_queries

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from back.users.get_user import get_current_user_or_raise_exception

class HTMLInput(BaseModel):
    html_content: str

class FileName(BaseModel):
    name: str

router = APIRouter(prefix="/notes")


@router.post("/post_note")
async def post_page(data: HTMLInput, user: Optional[str] = Depends(get_current_user_or_raise_exception)):
    try:
        file_name = f'{uuid.uuid4()}'
        file_path = os.path.join(f'back/users_notes', file_name + ".html")
        if not db_queries.insert_note(file_name):
            return {"message": "Автор не существует или такая заметка уже есть"}

        with open(file_path, "w", encoding="utf-8") as file:
            file.write(data.html_content)
        return {"message": "HTML-файл успешно сохранен", "file_name": file_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении файла: {str(e)}")


@router.get("/get_note/{file_name}", response_class = HTMLResponse)
async def get_note(file_name: str):
    try:
        file_path = f'back/users_notes/{file_name}.html'
        content = ""
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail = f"Ошибка при поиске файла: {str(e)}")


@router.get("/user_notes/{username}")
async def all_user_notes(username: str = "anonim"):
    note_titles = db_queries.get_all_notes_from_author(username)
    return ["/notes/get_note/" + i for i in note_titles]