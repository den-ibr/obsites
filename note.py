from pydantic import BaseModel


class Note(BaseModel):
    title: str
    author_id: int
