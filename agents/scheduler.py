import os
import pandas as pd
import json
from openai import OpenAI
from dotenv import load_dotenv
import glob

# Load environment variables
load_dotenv()

class SchedulerAgent:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
        
        # Initialize OpenAI client - compatible with both old and new versions
        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        
        # Paths
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_path = os.path.join(self.root_dir, "data", "applications_data.xlsx")
        
        # Check both potential locations for robustness
        self.transcript_dir = os.path.join(self.root_dir, "agents", "transcripts")
        if not os.path.exists(self.transcript_dir):
             self.transcript_dir = os.path.join(self.root_dir, "transcripts")
        
        self.output_file = os.path.join(self.root_dir, "data", "scheduled_interviews.xlsx")

    def load_candidate_data(self):
        """Loads master data to map names to emails."""
        try:
            df = pd.read_excel(self.data_path)
            # Create a lookup dictionary: Name -> Email
            # Normalize names to lowercase for better matching
            email_map = {}
            for _, row in df.iterrows():
                name = str(row.get('full_name', '')).strip().lower()
                email = str(row.get('email', '')).strip()
                if name:
                    email_map[name] = email
            return email_map
        except Exception as e:
            print(f"Error loading master data: {e}")
            return {}

    def extract_interview_details(self, transcript_text):
        """Uses LLM to extract schedule time and role from transcript."""
        prompt = f"""
You are an expert Data Extractor. Analyze the following interview transcript.
Your task is to identify if a **Technical Interview** was successfully scheduled.

Transcript:
{transcript_text}

Extract the following:
1. **scheduled**: Boolean (true if a specific date/time was agreed upon, false otherwise).
2. **schedule_time**: The agreed date and time.
   - **CRITICAL**: You MUST convert relative dates (e.g. "next Monday", "tomorrow") to an absolute date based on the "Date:" timestamp found in the transcript header.
   - **Format**: "DD-MM-YYYY HH:MM AM/PM" (e.g., "26-01-2026 10:00 AM").
3. **role**: The role discussed.
4. **final_salary**: The agreed or discussed salary (if available).

Return ONLY JSON:
{{
    "scheduled": true/false,
    "schedule_time": "DD-MM-YYYY HH:MM AM/PM",
    "role": "...",
    "final_salary": "..."
}}
"""
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You extract JSON from text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            content = completion.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"LLM Error: {e}")
            return {"scheduled": False}

    def process_transcripts(self):
        print("--- Scheduler Agent ---")
        email_map = self.load_candidate_data()
        
        if not os.path.exists(self.transcript_dir):
            print(f"No transcripts directory found at {self.transcript_dir}")
            return

        files = glob.glob(os.path.join(self.transcript_dir, "*.txt"))
        print(f"Found {len(files)} transcripts.")
        
        scheduled_candidates = []

        for filepath in files:
            filename = os.path.basename(filepath)
            # Filename format: Name_CallSid.txt or just Name_....txt
            # We assume name is the first part
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            print(f"Processing {filename}...", end="\r")
            
            # Extract basic info from Header if available
            # (Our server saves "Candidate: Name" at top)
            candidate_name = "Unknown"
            for line in content.splitlines():
                if line.startswith("Candidate:"):
                    candidate_name = line.split(":", 1)[1].strip()
                    break
            
            details = self.extract_interview_details(content)
            
            if details.get('scheduled'):
                email = email_map.get(candidate_name.lower(), "Email Not Found")
                
                scheduled_candidates.append({
                    "Candidate Name": candidate_name,
                    "Email": email,
                    "Role": details.get('role'),
                    "Scheduled Time": details.get('schedule_time'),
                    "Agreed Salary": details.get('final_salary'),
                    "Transcript File": filename
                })
        
        print(f"\nProcessing complete. Found {len(scheduled_candidates)} scheduled interviews.")
        
        if scheduled_candidates:
            self.save_schedule(scheduled_candidates)

    def save_schedule(self, data):
        df = pd.DataFrame(data)
        try:
            df.to_excel(self.output_file, index=False)
            print(f"Schedule saved to: {self.output_file}")
        except Exception as e:
            print(f"Error saving schedule: {e}")

if __name__ == "__main__":
    agent = SchedulerAgent()
    agent.process_transcripts()
