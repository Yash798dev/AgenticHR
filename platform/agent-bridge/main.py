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
    candidate_email: str
    salary: str
    start_date: str


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
    """Execute calendar agent."""
    try:
        update_task(task_id, "running")
        
        from agents.calendar_agent import CalendarAgent
        agent = CalendarAgent()
        result = agent.schedule_interviews(request.job_id)
        
        update_task(task_id, "completed", result=result)
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_interview_task(task_id: str, request: InterviewAgentRequest):
    """Execute interview agent (runs as subprocess)."""
    try:
        update_task(task_id, "running")
        
        import subprocess
        agent_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agents", "interview_agent.py")
        
        process = subprocess.Popen(
            [sys.executable, agent_path, "--job-id", request.job_id],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        update_task(task_id, "completed", result={
            "message": "Interview agent started",
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
        result = scorer.score_all(request.job_id)
        
        update_task(task_id, "completed", result=result)
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def run_offer_letter_task(task_id: str, request: OfferLetterRequest):
    """Execute offer letter agent."""
    try:
        update_task(task_id, "running")
        
        from agents.offer_letter_agent import OfferLetterAgent
        agent = OfferLetterAgent()
        result = agent.generate_and_send(
            job_id=request.job_id,
            candidate_email=request.candidate_email,
            salary=request.salary,
            start_date=request.start_date
        )
        
        update_task(task_id, "completed", result=result)
        
    except Exception as e:
        update_task(task_id, "failed", error=str(e))



@app.get("/")
async def root():
    return {"message": "Agentic HR Agent Bridge API", "version": "1.0.0"}


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
