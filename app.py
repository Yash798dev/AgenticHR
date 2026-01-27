"""
Agentic HR - LangGraph Orchestrator (Step-by-Step Mode)
=======================================================
Uses LangGraph for workflow orchestration with human-in-the-loop.
Each step waits for completion before allowing the next to run.
"""

import os
import sys
import operator
from typing import TypedDict, Annotated, List, Optional
from datetime import datetime
import pandas as pd
from dotenv import load_dotenv

# LangGraph imports
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Project root - fixed absolute path
PROJECT_ROOT = r"C:\Users\yashw\Desktop\AgenticHR"

# Add agents directory to path
sys.path.insert(0, os.path.join(PROJECT_ROOT, "agents"))

# Change working directory to project root
os.chdir(PROJECT_ROOT)

load_dotenv()


# ============================================================================
# AGENT FUNCTIONS (Standalone - not LangGraph nodes)
# ============================================================================

def run_resume_screener(job_id, role, min_experience, location, salary_range):
    """Run the resume screener and return results."""
    from resume_screener import JobScreener
    
    screener = JobScreener()
    if not screener.api_key:
        return {"success": False, "error": "GROQ_API_KEY not configured", "shortlisted": 0, "total": 0}
    
    df = screener.load_data()
    if df is None:
        return {"success": False, "error": "Could not load applications data", "shortlisted": 0, "total": 0}
    
    job_criteria = {
        "job_id": job_id,
        "role": role,
        "min_experience": min_experience,
        "location": location,
        "salary_range": salary_range
    }
    
    results = []
    for _, row in df.iterrows():
        evaluation = screener.evaluate_candidate(row, job_criteria)
        if evaluation.get('suitable'):
            row_dict = row.to_dict()
            row_dict['Screener_Reason'] = evaluation.get('reason')
            results.append(row_dict)
    
    if results:
        screener.save_results(results, job_id)
    
    return {
        "success": True,
        "shortlisted": len(results),
        "total": len(df),
        "file": f"data/shortlisted_{job_id}.xlsx"
    }


def run_voice_caller(job_id, server_url, role, salary_range):
    """Run the voice caller agent."""
    from voice_caller import VoiceCaller
    
    caller = VoiceCaller()
    if not caller.client:
        return {"success": False, "error": "Twilio not configured", "calls_made": 0}
    
    df = caller.load_shortlisted_candidates(job_id)
    if df is None:
        return {"success": False, "error": f"No shortlisted file for {job_id}", "calls_made": 0}
    
    calls_made = 0
    for _, row in df.iterrows():
        name = row.get('full_name', 'Candidate')
        mobile = row.get('mobile_number')
        caller.make_call(mobile, name, role, salary_range, server_url)
        calls_made += 1
    
    return {"success": True, "calls_made": calls_made}


def run_scheduler():
    """Run the scheduler agent."""
    from scheduler import SchedulerAgent
    
    agent = SchedulerAgent()
    agent.process_transcripts()
    
    scheduled_count = 0
    if os.path.exists(agent.output_file):
        df = pd.read_excel(agent.output_file)
        scheduled_count = len(df)
    
    return {"success": True, "scheduled": scheduled_count}


def run_calendar_agent():
    """Run the calendar agent."""
    from calendar_agent import CalendarAgent
    
    agent = CalendarAgent()
    agent.process_interviews()  # Fixed: was process_schedule()
    
    return {"success": True, "message": "Calendar events created"}


def run_interview_agent():
    """Run the interview agent as a subprocess (needed because Playwright conflicts with Streamlit)."""
    import subprocess
    
    # Get paths
    script_path = os.path.join(PROJECT_ROOT, "agents", "interview_agent.py")
    venv_python = os.path.join(PROJECT_ROOT, "venv", "Scripts", "python.exe")
    
    # Use venv python if it exists, otherwise system python
    python_cmd = venv_python if os.path.exists(venv_python) else "python"
    
    try:
        # Use cmd /k to run command and keep window open
        cmd = f'cmd /k "cd /d {PROJECT_ROOT} && "{python_cmd}" "{script_path}""'
        
        result = subprocess.Popen(
            cmd,
            shell=True,
            cwd=PROJECT_ROOT
        )
        return {"success": True, "message": "Interview agent started in new window", "pid": result.pid}
    except Exception as e:
        return {"success": False, "error": str(e)}


def run_transcript_scorer():
    """Run the transcript scorer."""
    from transcript_scorer_agent import TranscriptScorer
    
    scorer = TranscriptScorer()
    scorer.process_existing_files()
    
    scored_count = 0
    scores_file = os.path.join(PROJECT_ROOT, "data", "interview_scores.xlsx")
    if os.path.exists(scores_file):
        df = pd.read_excel(scores_file)
        scored_count = len(df)
    
    return {"success": True, "scored": scored_count}


def run_offer_letter():
    """Run the offer letter agent."""
    from offer_letter_agent import OfferLetterAgent
    
    agent = OfferLetterAgent()
    agent.process_candidates()
    
    offers_sent = 0
    sent_log = os.path.join(PROJECT_ROOT, "data", "sent_offers.xlsx")
    if os.path.exists(sent_log):
        df = pd.read_excel(sent_log)
        offers_sent = len(df)
    
    return {"success": True, "offers_sent": offers_sent}


# ============================================================================
# STREAMLIT UI
# ============================================================================

def main():
    import streamlit as st
    
    st.set_page_config(
        page_title="Agentic HR - LangGraph",
        page_icon="🤖",
        layout="wide"
    )
    
    # Custom CSS
    st.markdown("""
    <style>
        .main-header {
            font-size: 2.5rem;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
        }
        .step-card {
            padding: 20px;
            border-radius: 10px;
            margin: 10px 0;
            border-left: 5px solid;
        }
        .step-pending { border-color: #9e9e9e; background: #f5f5f5; }
        .step-current { border-color: #2196F3; background: #e3f2fd; }
        .step-complete { border-color: #4CAF50; background: #e8f5e9; }
        .step-error { border-color: #f44336; background: #ffebee; }
    </style>
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown('<h1 class="main-header">🤖 Agentic HR</h1>', unsafe_allow_html=True)
    st.markdown('<p style="text-align: center; color: #666;">Step-by-Step Workflow • Human-in-the-Loop</p>', 
                unsafe_allow_html=True)
    
    # Initialize session state
    if 'current_step' not in st.session_state:
        st.session_state.current_step = 0
    if 'step_results' not in st.session_state:
        st.session_state.step_results = {}
    if 'job_config' not in st.session_state:
        st.session_state.job_config = {}
    
    # Define workflow steps
    STEPS = [
        {"name": "📋 Resume Screener", "desc": "Filter candidates based on job criteria", "key": "resume_screener"},
        {"name": "📞 Voice Caller", "desc": "Call shortlisted candidates via Twilio", "key": "voice_caller"},
        {"name": "📅 Scheduler", "desc": "Extract schedules from call transcripts", "key": "scheduler"},
        {"name": "🗓️ Calendar Agent", "desc": "Create Google Meet links", "key": "calendar_agent"},
        {"name": "🎤 Interview Agent", "desc": "Conduct AI interviews on Meet", "key": "interview_agent"},
        {"name": "📊 Transcript Scorer", "desc": "Score transcripts with LLM", "key": "transcript_scorer"},
        {"name": "✉️ Offer Letter", "desc": "Send offers to selected candidates", "key": "offer_letter"},
    ]
    
    # Sidebar - Workflow Status
    with st.sidebar:
        st.markdown("## 🔄 Workflow Progress")
        
        for i, step in enumerate(STEPS):
            if i < st.session_state.current_step:
                status_class = "step-complete"
                status_icon = "✅"
            elif i == st.session_state.current_step:
                status_class = "step-current"
                status_icon = "▶️"
            else:
                status_class = "step-pending"
                status_icon = "⏳"
            
            result = st.session_state.step_results.get(step['key'], {})
            result_text = ""
            if result:
                if result.get('success'):
                    result_text = f" - ✓"
                else:
                    result_text = f" - ✗"
            
            st.markdown(f"""
            <div class="step-card {status_class}">
                {status_icon} <b>Step {i+1}: {step['name']}</b>{result_text}<br/>
                <small>{step['desc']}</small>
            </div>
            """, unsafe_allow_html=True)
        
        st.markdown("---")
        if st.button("🔄 Reset Workflow", use_container_width=True):
            st.session_state.current_step = 0
            st.session_state.step_results = {}
            st.session_state.job_config = {}
            st.rerun()
    
    # Main content
    current = st.session_state.current_step
    
    # Step 0: Job Configuration
    if current == 0:
        st.markdown("## Step 1: 📋 Resume Screener")
        st.markdown("First, configure the job criteria and screen resumes.")
        
        col1, col2 = st.columns(2)
        with col1:
            job_id = st.text_input("Job ID", value="J001")
            role = st.text_input("Role", value="Python Developer")
            min_exp = st.number_input("Min Experience (years)", value=0.0, step=0.5)
        with col2:
            location = st.text_input("Location", value="Bangalore")
            salary_range = st.text_input("Salary Range", value="8-12 LPA")
            server_url = st.text_input("Voice Server URL (for later)", placeholder="https://ngrok-url.app")
        
        st.markdown("---")
        
        if st.button("▶️ Run Resume Screener", type="primary", use_container_width=True):
            # Save config
            st.session_state.job_config = {
                "job_id": job_id,
                "role": role,
                "min_experience": min_exp,
                "location": location,
                "salary_range": salary_range,
                "server_url": server_url
            }
            
            with st.spinner("Screening resumes..."):
                result = run_resume_screener(job_id, role, min_exp, location, salary_range)
            
            st.session_state.step_results['resume_screener'] = result
            
            if result['success']:
                st.success(f"✅ Shortlisted {result['shortlisted']}/{result['total']} candidates")
                st.session_state.current_step = 1
                st.rerun()
            else:
                st.error(f"❌ Error: {result['error']}")
    
    # Step 1: Voice Caller
    elif current == 1:
        st.markdown("## Step 2: 📞 Voice Caller")
        
        prev_result = st.session_state.step_results.get('resume_screener', {})
        st.info(f"Previous step: Shortlisted {prev_result.get('shortlisted', 0)} candidates")
        
        config = st.session_state.job_config
        server_url = st.text_input("Voice Server URL (ngrok)", value=config.get('server_url', ''))
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Run Voice Caller", type="primary", use_container_width=True):
                if not server_url:
                    st.warning("Please enter a voice server URL")
                else:
                    with st.spinner("Making calls..."):
                        result = run_voice_caller(
                            config['job_id'], server_url, 
                            config['role'], config['salary_range']
                        )
                    
                    st.session_state.step_results['voice_caller'] = result
                    
                    if result['success']:
                        st.success(f"✅ Made {result['calls_made']} calls")
                        st.session_state.current_step = 2
                        st.rerun()
                    else:
                        st.error(f"❌ {result['error']}")
        
        with col2:
            if st.button("⏭️ Skip Voice Caller", use_container_width=True):
                st.session_state.step_results['voice_caller'] = {"success": True, "skipped": True}
                st.session_state.current_step = 2
                st.rerun()
    
    # Step 2: Scheduler
    elif current == 2:
        st.markdown("## Step 3: 📅 Scheduler")
        st.markdown("Extract scheduled interview times from call transcripts.")
        
        st.info("Make sure voice call transcripts are saved in `agents/transcripts/` folder")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Run Scheduler", type="primary", use_container_width=True):
                with st.spinner("Processing transcripts..."):
                    result = run_scheduler()
                
                st.session_state.step_results['scheduler'] = result
                st.success(f"✅ Found {result['scheduled']} scheduled interviews")
                st.session_state.current_step = 3
                st.rerun()
        
        with col2:
            if st.button("⏭️ Skip to Next", use_container_width=True):
                st.session_state.step_results['scheduler'] = {"success": True, "skipped": True}
                st.session_state.current_step = 3
                st.rerun()
    
    # Step 3: Calendar Agent
    elif current == 3:
        st.markdown("## Step 4: 🗓️ Calendar Agent")
        st.markdown("Create Google Meet links for scheduled interviews.")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Run Calendar Agent", type="primary", use_container_width=True):
                with st.spinner("Creating calendar events..."):
                    try:
                        result = run_calendar_agent()
                        st.session_state.step_results['calendar_agent'] = result
                        st.success("✅ Calendar events created")
                    except Exception as e:
                        st.error(f"❌ Error: {str(e)}")
                        st.session_state.step_results['calendar_agent'] = {"success": False, "error": str(e)}
                
                st.session_state.current_step = 4
                st.rerun()
        
        with col2:
            if st.button("⏭️ Skip to Next", use_container_width=True):
                st.session_state.step_results['calendar_agent'] = {"success": True, "skipped": True}
                st.session_state.current_step = 4
                st.rerun()
    
    # Step 4: Interview Agent
    elif current == 4:
        st.markdown("## Step 5: 🎤 Interview Agent")
        st.markdown("Conduct AI interviews on Google Meet.")
        
        st.warning("⚠️ This step monitors for scheduled meetings. For continuous monitoring, run `python agents/interview_agent.py` separately.")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Check for Meetings", type="primary", use_container_width=True):
                with st.spinner("Checking schedule..."):
                    try:
                        result = run_interview_agent()
                        st.session_state.step_results['interview_agent'] = result
                        st.success("✅ Interview check completed")
                    except Exception as e:
                        st.error(f"❌ Error: {str(e)}")
                        st.session_state.step_results['interview_agent'] = {"success": False, "error": str(e)}
                
                st.session_state.current_step = 5
                st.rerun()
        
        with col2:
            if st.button("⏭️ Skip to Scoring", use_container_width=True):
                st.session_state.step_results['interview_agent'] = {"success": True, "skipped": True}
                st.session_state.current_step = 5
                st.rerun()
    
    # Step 5: Transcript Scorer
    elif current == 5:
        st.markdown("## Step 6: 📊 Transcript Scorer")
        st.markdown("Score interview transcripts with LLM.")
        
        st.info("Transcripts from `unverified_transcripts/` will be processed")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Score Transcripts", type="primary", use_container_width=True):
                with st.spinner("Scoring transcripts..."):
                    try:
                        result = run_transcript_scorer()
                        st.session_state.step_results['transcript_scorer'] = result
                        st.success(f"✅ Scored {result['scored']} transcripts")
                    except Exception as e:
                        st.error(f"❌ Error: {str(e)}")
                        st.session_state.step_results['transcript_scorer'] = {"success": False, "error": str(e)}
                
                st.session_state.current_step = 6
                st.rerun()
        
        with col2:
            if st.button("⏭️ Skip to Offers", use_container_width=True):
                st.session_state.step_results['transcript_scorer'] = {"success": True, "skipped": True}
                st.session_state.current_step = 6
                st.rerun()
    
    # Step 6: Offer Letter
    elif current == 6:
        st.markdown("## Step 7: ✉️ Offer Letter")
        st.markdown("Send offer letters to candidates with positive recommendations.")
        
        # Show scores
        scores_file = os.path.join(PROJECT_ROOT, "data", "interview_scores.xlsx")
        if os.path.exists(scores_file):
            df = pd.read_excel(scores_file)
            st.markdown("### Current Scores")
            st.dataframe(df[['Candidate Name', 'Email', 'Role', 'Total Score', 'Recommendation']], 
                        use_container_width=True)
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Send Offer Letters", type="primary", use_container_width=True):
                with st.spinner("Sending offers..."):
                    try:
                        result = run_offer_letter()
                        st.session_state.step_results['offer_letter'] = result
                        st.success(f"✅ Sent {result['offers_sent']} offer letters")
                    except Exception as e:
                        st.error(f"❌ Error: {str(e)}")
                        st.session_state.step_results['offer_letter'] = {"success": False, "error": str(e)}
                
                st.session_state.current_step = 7
                st.rerun()
        
        with col2:
            if st.button("⏭️ Complete Without Sending", use_container_width=True):
                st.session_state.step_results['offer_letter'] = {"success": True, "skipped": True}
                st.session_state.current_step = 7
                st.rerun()
    
    # Workflow Complete
    elif current >= 7:
        st.markdown("## 🎉 Workflow Complete!")
        st.balloons()
        
        st.markdown("### Summary")
        
        col1, col2, col3 = st.columns(3)
        
        resume_result = st.session_state.step_results.get('resume_screener', {})
        with col1:
            st.metric("Shortlisted", resume_result.get('shortlisted', 0))
        
        scorer_result = st.session_state.step_results.get('transcript_scorer', {})
        with col2:
            st.metric("Scored", scorer_result.get('scored', 0))
        
        offer_result = st.session_state.step_results.get('offer_letter', {})
        with col3:
            st.metric("Offers Sent", offer_result.get('offers_sent', 0))
        
        st.markdown("---")
        
        # Show final data
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### 📊 Interview Scores")
            scores_file = os.path.join(PROJECT_ROOT, "data", "interview_scores.xlsx")
            if os.path.exists(scores_file):
                df = pd.read_excel(scores_file)
                st.dataframe(df, use_container_width=True)
        
        with col2:
            st.markdown("### ✉️ Sent Offers")
            offers_file = os.path.join(PROJECT_ROOT, "data", "sent_offers.xlsx")
            if os.path.exists(offers_file):
                df = pd.read_excel(offers_file)
                st.dataframe(df, use_container_width=True)
        
        if st.button("🔄 Start New Workflow", type="primary", use_container_width=True):
            st.session_state.current_step = 0
            st.session_state.step_results = {}
            st.session_state.job_config = {}
            st.rerun()


if __name__ == "__main__":
    main()
