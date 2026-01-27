import os
import pandas as pd
import json
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

class JobScreener:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
        self.data_path = r"C:\Users\yashw\Desktop\AgenticHR\data\applications_data.xlsx"
        
        if not self.api_key:
            print("WARNING: GROQ_API_KEY not found in .env file.")
            print("Please set your API key in the .env file.")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    def load_data(self):
        """Loads applicant data from Excel file."""
        try:
            df = pd.read_excel(self.data_path)
            # Ensure resume_text exists, fill NaN with empty string
            if 'resume_text' not in df.columns:
                print("Error: 'resume_text' column missing in data.")
                return None
            df['resume_text'] = df['resume_text'].fillna("")
            return df
        except FileNotFoundError:
            print(f"Error: Data file not found at {self.data_path}")
            return None
        except Exception as e:
            print(f"Error loading data: {e}")
            return None

    def get_job_criteria(self):
        """Prompts user for job requirements."""
        print("\n--- Enter Job Details ---")
        job_id = input("Job ID (e.g., J001): ").strip()
        role = input("Role (e.g., Python Developer): ").strip()
        try:
            min_exp = float(input("Minimum Experience (years): ").strip())
        except ValueError:
            print("Invalid input for experience. Defaulting to 0.")
            min_exp = 0.0
        location = input("Location (e.g., Bangalore): ").strip()
        salary_range = input("Salary Range (e.g., 10-15 LPA): ").strip()
        
        return {
            "job_id": job_id,
            "role": role,
            "min_experience": min_exp,
            "location": location,
            "salary_range": salary_range
        }

    def evaluate_candidate(self, candidate, job_criteria):
        """Uses Groq API to evaluate a candidate."""
        
        prompt = f"""
You are an expert HR Recruiter. Evaluate the following candidate for a job opening.

Job Requirements (STRICT CRITERIA):
- Role: {job_criteria['role']}
- Minimum Experience: {job_criteria['min_experience']} years
- Location: {job_criteria['location']}
- Salary Range: {job_criteria['salary_range']}

Candidate Profile:
- Name: {candidate.get('full_name', 'N/A')}
- Current Role: {candidate.get('current_role', 'N/A')}
- Experience: {candidate.get('total_experience_years', 0)} years
- Location: {candidate.get('current_location', 'N/A')}
- Skills: {candidate.get('skills', 'N/A')}
- Resume Text:
{candidate.get('resume_text', '')[:3000]}

Task:
Determine if this candidate is suitable for the role based on the following STRICT rules. 
If ANY of the conditions below are not met, the candidate must be rejected.

1. **Role & Skills**: Candidate MUST have relevant skills for the Role: "{job_criteria['role']}".
2. **Experience**: Candidate's total experience ({candidate.get('total_experience_years', 0)} years) MUST be greater than or equal to {job_criteria['min_experience']} years. NO exceptions.
3. **Location**: Candidate MUST be strictly located in "{job_criteria['location']}" OR explicitly state willingness to relocate.
4. **Salary**: Candidate's expected salary (if mentioned) MUST be within or below the offered range "{job_criteria['salary_range']}". If expected salary is significantly higher, reject.

Return ONLY a JSON object with the following format (no markdown code blocks):
{{
    "suitable": true/false,
    "reason": "Specific reason for acceptance or rejection based on the strict criteria."
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful HR assistant that outputs only JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"} 
            )
            
            content = response.choices[0].message.content
            # Cleanup code blocks if model adds them despite instructions
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
                
            return json.loads(content.strip())
            
        except Exception as e:
            print(f"Error evaluating candidate {candidate.get('full_name')}: {e}")
            return {"suitable": False, "reason": "Error in evaluation"}

    def process_applicants(self):
        df = self.load_data()
        if df is None:
            return

        job_criteria = self.get_job_criteria()
        print(f"\nProcessing {len(df)} candidates for Job ID: {job_criteria['job_id']}...")
        
        results = []
        shortlisted_count = 0

        for index, row in df.iterrows():
            print(f"Evaluating {row.get('full_name', 'Unknown')}...", end="\r")
            evaluation = self.evaluate_candidate(row, job_criteria)
            
            if evaluation.get('suitable'):
                row_dict = row.to_dict()
                row_dict['Screener_Reason'] = evaluation.get('reason')
                results.append(row_dict)
                shortlisted_count += 1
        
        print(f"\nCompleted! Shortlisted: {shortlisted_count}/{len(df)}")
        
        if results:
            self.save_results(results, job_criteria['job_id'])
        else:
            print("No candidates matched the criteria.")

    def save_results(self, results, job_id):
        output_file = r"C:\Users\yashw\Desktop\AgenticHR\data" + f"\\shortlisted_{job_id}.xlsx"
        try:
            df_result = pd.DataFrame(results)
            df_result.to_excel(output_file, index=False)
            print(f"Shortlisted candidates saved to: {output_file}")
        except Exception as e:
            print(f"Error saving results: {e}")

if __name__ == "__main__":
    screener = JobScreener()
    if screener.api_key:
        screener.process_applicants()
    else:
        # Dry run or prompt user to add key
        print("Set GROQ_API_KEY in .env to run evaluations.")
