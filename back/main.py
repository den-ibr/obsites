from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from get_files.save_html_page import router as test_router
from bd.db_queries import insert_user, insert_note, get_all_notes_from_author

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_router)

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)