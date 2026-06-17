from fastapi import FastAPI
from app.routers import optimize, chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Wealthy Eater AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize.router)
app.include_router(chat.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, env_file=".env")

