import os
import json
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse
from openai import OpenAI
from dotenv import load_dotenv
import datetime

# Load environment from project root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

app = FastAPI()

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1")
MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")

print(f"[CONFIG] GROQ_API_KEY: {'SET' if GROQ_API_KEY else 'NOT SET'}")
print(f"[CONFIG] Model: {MODEL}")

# Initialize OpenAI client
CLIENT = None
if GROQ_API_KEY:
    CLIENT = OpenAI(api_key=GROQ_API_KEY, base_url=GROQ_API_URL)

# In-memory store for conversation history
conversations = {}
candidate_context = {}


@app.post("/voice")
async def voice_start(request: Request):
    """Initial entry point for the call."""
    try:
        # Get form data from Twilio
        form_data = await request.form()
        CallSid = form_data.get("CallSid", "unknown")
        
        # Get candidate info from query parameters (passed in webhook URL)
        query_params = request.query_params
        candidate_name = query_params.get("candidate_name", "Candidate")
        role = query_params.get("role", "the position")
        salary_range = query_params.get("salary_range", "competitive")
        
        # URL decode the parameters
        from urllib.parse import unquote
        candidate_name = unquote(candidate_name)
        role = unquote(role)
        salary_range = unquote(salary_range)
        
        print(f"[CALL START] CallSid: {CallSid}")
        print(f"[CALL START] Candidate: {candidate_name}, Role: {role}, Salary: {salary_range}")
        
        # Initialize context
        candidate_context[CallSid] = {
            "name": candidate_name,
            "role": role,
            "salary_range": salary_range
        }
        
        # System Prompt
        system_prompt = f"""
You are an expert HR Recruiter at Agentic HR. You are calling {candidate_name} who has been shortlisted for the {role} position.
Your goals are:
1. Congratulate them on being shortlisted.
2. Discuss the Role briefly.
3. **NEGOTIATION**: The salary range is {salary_range}. Your objective is to convince them to agree to the LOWER end of this range significantly. Be persuasive but professional. Explain that we offer great benefits, stock options, and growth to justify the lower base pay.
4. **SCHEDULING**: Once salary is discussed (agreed or noted), ask for their availability for a technical interview (Date and Time). Make sure to get a specific slot.

Keep your responses concise (1-2 sentences) as this is a voice conversation. Speak naturally.
        """
        
        greeting = f"Hello {candidate_name}, this is a call from Agentic HR. Am I speaking with {candidate_name}?"
        
        conversations[CallSid] = [
            {"role": "system", "content": system_prompt},
            {"role": "assistant", "content": greeting}
        ]

        response = VoiceResponse()
        response.say(greeting, voice="alice")
        response.gather(input="speech", action="/process_speech", speechTimeout="auto", timeout=10)
        
        print(f"[RESPONSE] Sending TwiML greeting")
        return Response(content=str(response), media_type="application/xml")
        
    except Exception as e:
        print(f"[ERROR in /voice] {e}")
        traceback.print_exc()
        response = VoiceResponse()
        response.say("Sorry, there was a technical issue. Please try again later.")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")


@app.post("/process_speech")
async def process_speech(request: Request):
    """Handles the loop of receiving speech and responding."""
    try:
        # Get form data from Twilio
        form_data = await request.form()
        CallSid = form_data.get("CallSid", "")
        SpeechResult = form_data.get("SpeechResult", "")
        
        print(f"[SPEECH] CallSid: {CallSid}")
        print(f"[SPEECH] User said: {SpeechResult}")
        
        if CallSid not in conversations:
            print(f"[ERROR] CallSid {CallSid} not in conversations!")
            response = VoiceResponse()
            response.say("I'm sorry, I lost the connection details. Goodbye.")
            response.hangup()
            return Response(content=str(response), media_type="application/xml")
        
        # Add user message
        if SpeechResult:
            conversations[CallSid].append({"role": "user", "content": SpeechResult})
        
        # Get LLM Response
        ai_text = "I'm having trouble processing that. Could you repeat?"
        
        if CLIENT:
            try:
                completion = CLIENT.chat.completions.create(
                    model=MODEL,
                    messages=conversations[CallSid],
                    temperature=0.7,
                    max_tokens=150
                )
                ai_text = completion.choices[0].message.content
                conversations[CallSid].append({"role": "assistant", "content": ai_text})
                print(f"[AI] Response: {ai_text}")
                
            except Exception as e:
                print(f"[LLM Error] {e}")
        else:
            print("[ERROR] CLIENT not initialized - check GROQ_API_KEY")
        
        # Save Transcript
        save_transcript(CallSid)
        
        # Build TwiML Response
        response = VoiceResponse()
        response.say(ai_text, voice="alice")
        
        # End conversation check
        if "goodbye" in ai_text.lower() or "have a great day" in ai_text.lower():
            response.hangup()
        else:
            response.gather(input="speech", action="/process_speech", speechTimeout="auto", timeout=10)
        
        return Response(content=str(response), media_type="application/xml")
        
    except Exception as e:
        print(f"[ERROR in /process_speech] {e}")
        traceback.print_exc()
        response = VoiceResponse()
        response.say("I encountered an error. Goodbye.")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")


def save_transcript(call_sid):
    """Saves the conversation to a file."""
    if call_sid not in conversations:
        return
    
    history = conversations[call_sid]
    context = candidate_context.get(call_sid, {})
    name = context.get('name', 'Unknown')
    
    # Target: AgenticHR/transcripts (for scheduler to find)
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    transcript_dir = os.path.join(root_dir, "agents", "transcripts")
    
    os.makedirs(transcript_dir, exist_ok=True)
    
    filename = f"{name.replace(' ', '_')}_{call_sid}.txt"
    filepath = os.path.join(transcript_dir, filename)
    
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"Candidate: {name}\n")
            f.write(f"Role: {context.get('role')}\n")
            f.write(f"Salary Range: {context.get('salary_range')}\n")
            f.write(f"Date: {datetime.datetime.now()}\n")
            f.write("-" * 20 + "\n\n")
            
            for msg in history:
                if msg['role'] != 'system':
                    f.write(f"{msg['role'].upper()}: {msg['content']}\n")
        
        print(f"[TRANSCRIPT] Saved: {filepath}")
    except Exception as e:
        print(f"[ERROR] Saving transcript: {e}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "groq_configured": GROQ_API_KEY is not None}


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("VOICE SERVER STARTING")
    print("=" * 50)
    print(f"Working Dir: {os.getcwd()}")
    print(f"GROQ Key: {'✓' if GROQ_API_KEY else '✗ NOT SET'}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
