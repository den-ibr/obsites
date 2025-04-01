import asyncio
import os
import uuid
from optparse import Option
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from back.users.get_user import get_current_user_or_raise_exception

class HTMLInput(BaseModel):
    html_content: str

router = APIRouter(prefix="/post_page")
@router.post("")
async def post_page(data: HTMLInput, user: Optional[str] = Depends(get_current_user_or_raise_exception)):
    try:
        file_name = f'{uuid.uuid4()}.html'
        file_path = os.path.join(f'users_notes/anon', file_name)
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(data.html_content)
        return {"message": "HTML-файл успешно сохранен", "file_name": file_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении файла: {str(e)}")