from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatbotRequest, ChatbotResponse
from app.services.gemini_chat_service import generate_chat_response

router = APIRouter()

@router.post("/api/v1/ai/chat", response_model=ChatbotResponse)
def chat_with_ai(request: ChatbotRequest):
    try:
        reply = generate_chat_response(
            message=request.message,
            user_profile=request.user_profile,
            history=request.history
        )
        return ChatbotResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
