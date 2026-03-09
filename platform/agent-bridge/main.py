"""
Agentic HR - FastAPI Agent Bridge
=================================
REST API layer that exposes all Python agents as HTTP endpoints.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import asyncio
import uuid
import os
import sys

AGENT_BRIDGE_DIR = os.path.dirname(os.path.abspath(__file__))
PLATFORM_DIR = os.path.dirname(AGENT_BRIDGE_DIR)
ROOT_DIR = os.path.dirname(PLATFORM_DIR)
sys.path.insert(0, ROOT_DIR)

from agents.resume_screener import JobScreener
from agents.voice_caller import VoiceCaller

app = FastAPI(
    title="Agentic HR Agent Bridge",
    description="REST API for AI Hiring Agents",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

job_status: Dict[str, Dict[str, Any]] = {}

class ResumeScreenerRequest(BaseModel):
    job_id: str
    role: str
    min_experience: float
    location: str
    salary_range: str


class VoiceCallerRequest(BaseModel):
    job_id: str
    server_url: str
    role: str
    salary_range: str


class CalendarAgentRequest(BaseModel):
    job_id: str


class InterviewAgentRequest(BaseModel):
    job_id: str


class TranscriptScorerRequest(BaseModel):
    job_id: str


class OfferLetterRequest(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    task_id: str
    status: str  
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def create_task(agent_name: str) -> str:
    """Create a new task and return its ID."""
    task_id = str(uuid.uuid4())
    job_status[task_id] = {
        "agent": agent_name,
        "status": "pending",
        "result": None,
        "error": None
    }
    return task_id


def update_task(task_id: str, status: str, result: Any = None, error: str = None):
    """Update task status."""
    if task_id in job_status:
        job_status[task_id]["status"] = status
        job_status[task_id]["result"] = result
        job_status[task_id]["error"] = error



async def run_resume_screener_task(task_id: str, request: ResumeScreenerRequest):
    """Execute resume screener agent."""
    try:
        update_task(task_id, "running")
        
        screener = JobScreener()
        
        job_criteria = {
            "job_id": request.job_id,
            "role": request.role,
            "min_experience": request.min_experience,
            "location": request.location,
            "salary_range": request.salary_range
        }
        
        df = screener.load_data()
        if df is None:
            update_task(task_id, "failed", error="Failed to load applicant data")
            return
        
        results = []
        for _, row in df.iterrows():
            evaluation = screener.evaluate_candidate(row, job_criteria)
            if evaluation.get('suitable'):
                row_dict = row.to_dict()
                row_dict['Screener_Reason'] = evaluation.get('reason')
                results.append(row_dict)
        
        if results:
            screener.save_results(results, request.job_id)
        
        update_task(task_id, "completed", result={
            "total_candidates": len(df),
            "shortlisted": len(results),
            "job_id": request.job_id
        })
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_voice_caller_task(task_id: str, request: VoiceCallerRequest):
    """Execute voice caller agent."""
    try:
        update_task(task_id, "running")
        
        caller = VoiceCaller()
        df = caller.load_shortlisted_candidates(request.job_id)
        
        if df is None:
            update_task(task_id, "failed", error=f"No shortlisted candidates for job {request.job_id}")
            return
        
        calls_made = 0
        for _, row in df.iterrows():
            name = row.get('full_name', 'Candidate')
            mobile = row.get('mobile_number')
            caller.make_call(mobile, name, request.role, request.salary_range, request.server_url)
            calls_made += 1
        
        update_task(task_id, "completed", result={
            "calls_initiated": calls_made,
            "job_id": request.job_id
        })
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_calendar_task(task_id: str, request: CalendarAgentRequest):
    """Execute scheduler agent first (to create scheduled_interviews.xlsx), then calendar agent."""
    try:
        update_task(task_id, "running")
        
        # Step 1: Run Scheduler to extract interview times from voice call transcripts
        from agents.scheduler import SchedulerAgent
        scheduler = SchedulerAgent()
        scheduler.process_transcripts()
        
        # Step 2: Run Calendar Agent to create Google Calendar events
        from agents.calendar_agent import CalendarAgent
        agent = CalendarAgent()
        agent.process_interviews()
        
        update_task(task_id, "completed", result={"message": "Scheduler + Calendar events processed"})
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_interview_task(task_id: str, request: InterviewAgentRequest):
    """Execute interview agent (runs as subprocess)."""
    try:
        update_task(task_id, "running")
        
        import subprocess
        agent_path = os.path.join(ROOT_DIR, "agents", "interview_agent.py")
        
        # Launch as detached process - it runs a loop checking schedule every 1 min
        process = subprocess.Popen(
            [sys.executable, agent_path],
            cwd=ROOT_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        update_task(task_id, "completed", result={
            "message": "Interview agent started (monitoring schedule in background)",
            "pid": process.pid,
            "job_id": request.job_id
        })
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_transcript_scorer_task(task_id: str, request: TranscriptScorerRequest):
    """Execute transcript scorer agent."""
    try:
        update_task(task_id, "running")
        
        from agents.transcript_scorer_agent import TranscriptScorer
        scorer = TranscriptScorer()
        scorer.process_existing_files()
        
        # Read the scores to return as result
        import pandas as pd
        scores_file = os.path.join(ROOT_DIR, "data", "interview_scores.xlsx")
        result_data = {"message": "Transcripts scored successfully", "scores_count": 0}
        
        if os.path.exists(scores_file):
            df = pd.read_excel(scores_file)
            result_data["scores_count"] = len(df)
            
        update_task(task_id, "completed", result=result_data)
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_offer_letter_task(task_id: str, request: OfferLetterRequest):
    """Execute offer letter agent."""
    try:
        update_task(task_id, "running")
        
        from agents.offer_letter_agent import OfferLetterAgent
        agent = OfferLetterAgent()
        agent.process_candidates()
        
        # Read the sent log to return as result
        import pandas as pd
        sent_log = os.path.join(ROOT_DIR, "data", "sent_offers.xlsx")
        result_data = {"message": "Offer letters processed successfully", "offers_sent": 0}
        
        if os.path.exists(sent_log):
            df = pd.read_excel(sent_log)
            result_data["offers_sent"] = len(df)
        
        update_task(task_id, "completed", result=result_data)
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))



@app.get("/")
async def root():
    return {"message": "Agentic HR Agent Bridge API", "version": "1.0.0"}


from fastapi import Request
from agents.voice_server import voice_start, process_speech as voice_process_speech

@app.post("/voice")
async def voice_callback(request: Request):
    """Twilio webhook - delegates to voice_server.py for AI conversation."""
    return await voice_start(request)

@app.post("/process_speech")
async def process_speech_callback(request: Request):
    """Twilio gather callback - delegates to voice_server.py for LLM response."""
    return await voice_process_speech(request)


@app.get("/api/agents/interview/status")
async def get_interview_status():
    """Returns the current interview agent status from the JSON status file."""
    import json
    status_file = os.path.join(ROOT_DIR, "data", "interview_agent_status.json")
    if not os.path.exists(status_file):
        return {"state": "not_started", "logs": [], "current_candidate": None}
    try:
        with open(status_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"state": "error", "logs": [], "current_candidate": None}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/agents/resume-screener/run", response_model=JobStatusResponse)
async def run_resume_screener(request: ResumeScreenerRequest, background_tasks: BackgroundTasks):
    task_id = create_task("resume_screener")
    background_tasks.add_task(run_resume_screener_task, task_id, request)
    return JobStatusResponse(task_id=task_id, status="pending")


@app.post("/api/agents/voice-caller/run", response_model=JobStatusResponse)
async def run_voice_caller(request: VoiceCallerRequest, background_tasks: BackgroundTasks):
    task_id = create_task("voice_caller")
    background_tasks.add_task(run_voice_caller_task, task_id, request)
    return JobStatusResponse(task_id=task_id, status="pending")


@app.post("/api/agents/calendar/run", response_model=JobStatusResponse)
async def run_calendar(request: CalendarAgentRequest, background_tasks: BackgroundTasks):
    task_id = create_task("calendar_agent")
    background_tasks.add_task(run_calendar_task, task_id, request)
    return JobStatusResponse(task_id=task_id, status="pending")


@app.post("/api/agents/interview/run", response_model=JobStatusResponse)
async def run_interview(request: InterviewAgentRequest, background_tasks: BackgroundTasks):
    task_id = create_task("interview_agent")
    background_tasks.add_task(run_interview_task, task_id, request)
    return JobStatusResponse(task_id=task_id, status="pending")


@app.post("/api/agents/transcript-scorer/run", response_model=JobStatusResponse)
async def run_transcript_scorer(request: TranscriptScorerRequest, background_tasks: BackgroundTasks):
    task_id = create_task("transcript_scorer")
    background_tasks.add_task(run_transcript_scorer_task, task_id, request)
    return JobStatusResponse(task_id=task_id, status="pending")


@app.post("/api/agents/offer-letter/run", response_model=JobStatusResponse)
async def run_offer_letter(request: OfferLetterRequest, background_tasks: BackgroundTasks):
    task_id = create_task("offer_letter")
    background_tasks.add_task(run_offer_letter_task, task_id, request)
    return JobStatusResponse(task_id=task_id, status="pending")

@app.get("/api/tasks/{task_id}", response_model=JobStatusResponse)
async def get_task_status(task_id: str):
    if task_id not in job_status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = job_status[task_id]
    return JobStatusResponse(
        task_id=task_id,
        status=task["status"],
        result=task["result"],
        error=task["error"]
    )

@app.get("/api/tasks")
async def list_tasks():
    return {"tasks": job_status}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
