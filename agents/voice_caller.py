import os
import pandas as pd
from twilio.rest import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class VoiceCaller:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        self.data_dir = r"C:\Users\yashw\Desktop\AgenticHR\data"
        
        if not all([self.account_sid, self.auth_token, self.from_number]):
            print("WARNING: Twilio credentials not found in .env file.")
            print("Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.")
            self.client = None
        else:
            try:
                self.client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                print(f"Error initializing Twilio client: {e}")
                self.client = None

    def load_shortlisted_candidates(self, job_id):
        """Loads shortlisted candidates for a specific job."""
        file_path = os.path.join(self.data_dir, f"shortlisted_{job_id}.xlsx")
        try:
            df = pd.read_excel(file_path)
            return df
        except FileNotFoundError:
            print(f"Error: Shortlisted file not found for Job ID: {job_id}")
            print(f"Path checked: {file_path}")
            return None
        except Exception as e:
            print(f"Error loading file: {e}")
            return None

    def make_call(self, to_number, candidate_name, role, salary_range, server_url):
        """Initiates a voice call to the candidate connected to the AI Server."""
        if not self.client:
            print(f"Skipping call to {candidate_name} (Twilio not configured)")
            return

        # Sanitize phone number (basic)
        to_number = str(to_number).strip()
        if not to_number.startswith("+"):
            # Assume India country code if missing
            if len(to_number) == 10:
                to_number = "+91" + to_number
            else:
                 print(f"Warning: Phone number format might be incorrect for {candidate_name}: {to_number}")

        # Construct Webhook URL with parameters
        from urllib.parse import urlencode, quote
        
        # NOTE: We can't pass params in 'url' easily for Twilio POST unless encoded or using query params.
        # But Twilio 'url' attribute expects an endpoint that returns TwiML.
        # We will use parameters in the URL query string.
        # However, to pass data to the INITIAL /voice endpoint, we can use encoded params.
        
        params = {
            "candidate_name": candidate_name,
            "role": role,
            "salary_range": salary_range
        }
        encoded_params = urlencode(params)
        webhook_url = f"{server_url}/voice?{encoded_params}"

        try:
            call = self.client.calls.create(
                url=webhook_url,
                to=to_number,
                from_=self.from_number,
                method="POST"
            )
            print(f"Call initiated for {candidate_name} ({to_number}). Call SID: {call.sid}")
        except Exception as e:
            print(f"Failed to call {candidate_name}: {e}")

    def process_candidates(self):
        print("\n--- Voice Caller Agent ---")
        job_id = input("Enter Job ID to process (e.g., J001): ").strip()
        server_url = input("Enter Public Server URL (e.g., https://xyz.ngrok.app): ").strip()
        
        # Remove trailing slash
        if server_url.endswith("/"):
            server_url = server_url[:-1]
        
        df = self.load_shortlisted_candidates(job_id)
        if df is None:
            return

        print(f"Found {len(df)} candidates to contact.")
        
        # Ask for details if not present (Salary/Role might vary per candidate or be fixed)
        # We will ask once for simplicity if not in file, but 'role' might be needed.
        # Assuming homogeneous job file.
        
        default_role = input("Enter Role Name (e.g. Python Dev): ").strip()
        default_salary = input("Enter Offered Salary Range (e.g. 10-12 LPA): ").strip()

        for index, row in df.iterrows():
            name = row.get('full_name', 'Candidate')
            mobile = row.get('mobile_number')
            
            print(f"Calling {name}...", end="\r")
            self.make_call(mobile, name, default_role, default_salary, server_url)
        
        print("\nAll calls processed.")

if __name__ == "__main__":
    agent = VoiceCaller()
    if agent.client:
        agent.process_candidates()
    else:
        print("Twilio client not ready.")
