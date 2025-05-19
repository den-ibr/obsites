from pydantic import BaseModel


class User(BaseModel):
    id: int
    token: str
    