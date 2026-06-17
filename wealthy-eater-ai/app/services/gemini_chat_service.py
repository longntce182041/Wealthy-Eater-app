import os
import logging
from google import genai

from google.genai import types

from .prompts import get_chatbot_system_prompt
from .tools import chatbot_tools

logger = logging.getLogger(__name__)

def generate_chat_response(message: str, user_profile: dict, history: list[dict] = None) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return f"[MOCK] Avoid allergies. (GEMINI_API_KEY not set)"
        
    client = genai.Client(api_key=api_key)
    
    system_instruction = get_chatbot_system_prompt(user_profile)
    
    contents = []
    if history:
        for msg in history:
            role = "user" if msg.get("isUser") else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.get("text", ""))]
                )
            )
            
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)]
        )
    )
    
    # Model Fallback Mechanism
    models_to_try = [
        "gemini-2.5-flash",    # Primary (Latest)
        "gemini-1.5-flash",    # Fallback
        "gemini-1.5-pro",      # Fallback 2
        "gemini-1.5-flash-8b"  # Fallback 3
    ]
    
    last_error = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                    tools=chatbot_tools
                )
            )
            
            # AI Agent Loop: Handle automatic tool execution
            max_iterations = 3
            iterations = 0
            
            while response.function_calls and iterations < max_iterations:
                iterations += 1
                contents.append(response.candidates[0].content)
                
                function_responses = []
                for fc in response.function_calls:
                    name = fc.name
                    args = fc.args
                    
                    # Execute tool
                    result = None
                    for tool in chatbot_tools:
                        if tool.__name__ == name:
                            try:
                                result = tool(**args)
                            except Exception as e:
                                result = {"error": str(e)}
                            break
                    
                    function_responses.append(
                        types.Part.from_function_response(
                            name=name,
                            response={"result": result}
                        )
                    )
                
                contents.append(
                    types.Content(
                        role="user",
                        parts=function_responses
                    )
                )
                
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        tools=chatbot_tools
                    )
                )
                
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            # If rate limit (429), service unavailable (503), or not found (404), try the next model
            if "429" in error_msg or "quota" in error_msg or "rate limit" in error_msg or "503" in error_msg or "404" in error_msg or "not found" in error_msg:
                last_error = e
                logger.warning(f"[AI Fallback] Model {model_name} failed due to rate limit/availability ({error_msg[:50]}). Trying next...")
                continue
            # If it's a structural error (like 400 Bad Request), throw immediately
            raise e
            
    # If all models are exhausted
    if last_error:
        raise Exception(f"All AI fallback models exhausted due to rate limits. Last error: {last_error}")
    
    return "Xin lỗi, hệ thống AI hiện đang quá tải. Vui lòng thử lại sau ít phút."
