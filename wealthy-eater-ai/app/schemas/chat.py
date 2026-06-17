from pydantic import BaseModel
from typing import List

class ChatbotRequest(BaseModel):
    message: str
    user_profile: dict
    history: List[dict] = []

class ChatbotResponse(BaseModel):
    reply: str
