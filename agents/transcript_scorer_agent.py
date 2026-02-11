"""
Transcript Scorer Agent
-----------------------
Monitors unverified_transcripts folder for new interview transcripts.
For each transcript:
1. Reads the content
2. Uses LLM to analyze and generate a confidence score
3. Saves results (name, email, filepath, score) to Excel
4. Moves transcript to verified_transcripts folder
"""

import os
import time
import shutil
import requests
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

load_dotenv()


class GroqClient:
    """Direct Groq API client."""
    
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.api_url = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
        
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in .env file!")
    
    def chat(self, messages, temperature=0.3, max_tokens=500):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[ERROR] Groq API error: {e}")
            return None


class TranscriptScorer:
    """Scores interview transcripts using LLM."""
    
    def __init__(self):
        self.groq = GroqClient()
        
        self.unverified_dir = os.path.join(os.getcwd(), "unverified_transcripts")
        self.verified_dir = os.path.join(os.getcwd(), "verified_transcripts")
        self.results_file = os.path.join(os.getcwd(), "data", "interview_scores.xlsx")
        
        os.makedirs(self.unverified_dir, exist_ok=True)
        os.makedirs(self.verified_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.results_file), exist_ok=True)
        
        print("\n" + "="*60)
        print("[START] TRANSCRIPT SCORER AGENT")
        print("="*60)
        print(f"[CONFIG] Unverified: {self.unverified_dir}")
        print(f"[CONFIG] Verified: {self.verified_dir}")
        print(f"[CONFIG] Results: {self.results_file}")
        print("="*60 + "\n")
    
    def clean_caption_noise(self, text):
        """Remove Google Meet caption UI elements from transcript."""
        noise_lines = {
            'language', 'English', 'format_size', 'Font size', 
            'circle', 'Font color', 'settings', 'Open caption settings',
            'Hindi', 'Spanish', 'French', 'German' 
        }
        
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped in noise_lines:
                continue
            if len(stripped.split()) <= 2 and not stripped.startswith(('Agent:', 'Candidate:')):
                words = stripped.split()
                if all(w[0].isupper() if w else False for w in words):
                    continue
            
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def parse_transcript(self, filepath):
        """Read and parse transcript file, cleaning caption noise."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            candidate_name = "Unknown"
            candidate_email = "Not provided"
            role = "Unknown"
            
            for line in lines:
                if line.startswith("Interview Transcript:"):
                    candidate_name = line.replace("Interview Transcript:", "").strip()
                elif line.startswith("Email:"):
                    candidate_email = line.replace("Email:", "").strip()
                elif line.startswith("Role:"):
                    role = line.replace("Role:", "").strip()
                elif line.startswith("="):
                    break  
            cleaned_content = self.clean_caption_noise(content)
            
            print(f"[CLEAN] Removed caption UI noise from transcript")
            print(f"[INFO] Candidate: {candidate_name}, Email: {candidate_email}, Role: {role}")
            
            return {
                "name": candidate_name,
                "email": candidate_email,
                "content": cleaned_content,
                "role": role
            }
        except Exception as e:
            print(f"[ERROR] Failed to parse {filepath}: {e}")
            return None
    
    def score_transcript(self, transcript_data):
        """Use LLM to score the transcript."""
        system_prompt = """You are an expert HR interviewer analyzing interview transcripts.

TRANSCRIPT FORMAT:
- Lines starting with "Agent:" are the interviewer's questions
- Lines starting with "Candidate:" are the candidate's responses
- Focus ONLY on evaluating the CANDIDATE's responses, not the Agent's questions

TASK: Evaluate the candidate's responses and provide a confidence score.

SCORING CRITERIA (0-100):
- Communication Skills (0-20): Clarity, articulation, professional language
- Technical Knowledge (0-25): Relevant skills, domain expertise, problem-solving ability
- Experience Relevance (0-20): Past experience matching the role requirements
- Enthusiasm & Fit (0-15): Interest in the role, cultural fit indicators
- Response Quality (0-20): Complete answers, depth of responses, relevance

OUTPUT FORMAT (JSON only, no other text):
{
    "candidate_name": "extracted name from transcript",
    "email": "if mentioned, else 'Not provided'",
    "role": "position applied for",
    "communication_score": 0-20,
    "technical_score": 0-25,
    "experience_score": 0-20,
    "enthusiasm_score": 0-15,
    "response_quality_score": 0-20,
    "total_score": 0-100,
    "summary": "2-3 sentence evaluation of the candidate",
    "recommendation": "Strongly Recommend / Recommend / Consider / Do Not Recommend"
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Please analyze this interview transcript and score the CANDIDATE's performance:\n\n{transcript_data['content']}"}
        ]
        
        response = self.groq.chat(messages)
        
        if response:
            try:
                import json
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    return json.loads(json_str)
            except Exception as e:
                print(f"[ERROR] Failed to parse LLM response: {e}")
                print(f"[DEBUG] Response: {response}")
        
        return None
    
    def save_to_excel(self, score_data, filepath):
        """Save score to Excel file."""
        try:
            if os.path.exists(self.results_file):
                df = pd.read_excel(self.results_file)
            else:
                df = pd.DataFrame(columns=[
                    'Candidate Name', 'Email', 'Role', 'Communication', 'Technical',
                    'Experience', 'Enthusiasm', 'Response Quality', 'Total Score',
                    'Recommendation', 'Summary', 'Transcript Path', 'Scored Date'
                ])
            
            new_row = {
                'Candidate Name': score_data.get('candidate_name', 'Unknown'),
                'Email': score_data.get('email', 'Not provided'),
                'Role': score_data.get('role', 'Unknown'),
                'Communication': score_data.get('communication_score', 0),
                'Technical': score_data.get('technical_score', 0),
                'Experience': score_data.get('experience_score', 0),
                'Enthusiasm': score_data.get('enthusiasm_score', 0),
                'Response Quality': score_data.get('response_quality_score', 0),
                'Total Score': score_data.get('total_score', 0),
                'Recommendation': score_data.get('recommendation', 'N/A'),
                'Summary': score_data.get('summary', ''),
                'Transcript Path': filepath,
                'Scored Date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            df.to_excel(self.results_file, index=False)
            print(f"[SAVED] Score added to {self.results_file}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to save to Excel: {e}")
            return False
    
    def move_to_verified(self, filepath):
        """Move transcript from unverified to verified folder."""
        try:
            filename = os.path.basename(filepath)
            dest_path = os.path.join(self.verified_dir, filename)
            shutil.move(filepath, dest_path)
            print(f"[MOVED] {filename} -> verified_transcripts/")
            return dest_path
        except Exception as e:
            print(f"[ERROR] Failed to move file: {e}")
            return None
    
    def process_transcript(self, filepath):
        """Process a single transcript file."""
        filename = os.path.basename(filepath)
        print(f"\n{'='*60}")
        print(f"[PROCESSING] {filename}")
        print('='*60)
        
        print("[STEP 1] Reading transcript...")
        transcript_data = self.parse_transcript(filepath)
        if not transcript_data:
            print("[FAILED] Could not parse transcript")
            return False
        print(f"[OK] Candidate: {transcript_data['name']}")
        
        print("[STEP 2] Analyzing with LLM...")
        score_data = self.score_transcript(transcript_data)
        if not score_data:
            print("[FAILED] Could not score transcript")
            return False
        
        # Use email from transcript header (more reliable than LLM extraction)
        score_data['email'] = transcript_data.get('email', 'Not provided')
        score_data['role'] = transcript_data.get('role', score_data.get('role', 'Unknown'))
        
        print(f"[OK] Score: {score_data.get('total_score', 'N/A')}/100")
        print(f"[OK] Recommendation: {score_data.get('recommendation', 'N/A')}")
        print(f"[OK] Email: {score_data['email']}")
        
        print("[STEP 3] Saving to Excel...")
        if not self.save_to_excel(score_data, filepath):
            return False
        
        print("[STEP 4] Moving to verified folder...")
        new_path = self.move_to_verified(filepath)
        
        print(f"\n[COMPLETE] Processed {filename}")
        return True
    
    def process_existing_files(self):
        """Process any existing files in unverified folder."""
        files = [f for f in os.listdir(self.unverified_dir) if f.endswith('.txt')]
        if files:
            print(f"[FOUND] {len(files)} existing transcripts to process")
            for filename in files:
                filepath = os.path.join(self.unverified_dir, filename)
                self.process_transcript(filepath)
    
    def run(self):
        """Main loop - watches for new transcripts."""
        print("[RUN] Transcript Scorer running. Press Ctrl+C to stop.\n")
        
        self.process_existing_files()
        
        event_handler = TranscriptHandler(self)
        observer = Observer()
        observer.schedule(event_handler, self.unverified_dir, recursive=False)
        observer.start()
        
        print(f"\n[WATCHING] Monitoring {self.unverified_dir} for new transcripts...")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            print("\n[STOP] Transcript Scorer stopped.")
        
        observer.join()


class TranscriptHandler(FileSystemEventHandler):
    """Handles new file events in unverified folder."""
    
    def __init__(self, scorer):
        self.scorer = scorer
    
    def on_created(self, event):
        if event.is_directory:
            return
        
        if event.src_path.endswith('.txt'):
            time.sleep(1)
            print(f"\n[NEW FILE] {os.path.basename(event.src_path)}")
            self.scorer.process_transcript(event.src_path)


if __name__ == "__main__":
    scorer = TranscriptScorer()
    scorer.run()
