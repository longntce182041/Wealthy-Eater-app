from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chat_endpoint():
    response = client.post(
        "/api/v1/ai/chat",
        json={
            "message": "Suggest a peanut butter snack.",
            "user_profile": {
                "tdee": 2400,
                "dietary_references": {"allergies": ["peanuts"]}
            }
        }
    )
    
    if response.status_code != 200:
        print("Error Response:", response.text)
    assert response.status_code == 200
    data = response.json()
    print("AI Response:", data["reply"])
    
    # Check if the MOCK response formatted correctly or if Gemini refused (if we had API key)
    assert "[MOCK]" in data["reply"] or "peanuts" in data["reply"].lower()
    print("Test passed successfully!")

if __name__ == "__main__":
    test_chat_endpoint()
