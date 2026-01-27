import requests
import os
import datetime
import pandas as pd
import google_auth_httplib2
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar']

class RequestsHttp:
    """Adapter to make requests.Session look like httplib2.Http."""
    def __init__(self, timeout=60):
        self.session = requests.Session()
        self.session.trust_env = False # Ignore system proxies, force direct connection
        self.timeout = timeout

    class Response(dict):
        """Response object that mimics httplib2.Response."""
        def __init__(self, headers, status):
            super().__init__(headers)
            self.status = status
            self.reason = "OK" # Placeholder

    def request(self, uri, method="GET", body=None, headers=None, redirections=5, connection_type=None):
        if headers is None:
            headers = {}
        try:
            response = self.session.request(
                method, 
                uri, 
                data=body, 
                headers=headers, 
                timeout=self.timeout
            )
            
            # Format headers to mimic httplib2
            resp_headers = dict(response.headers)
            # Create object that has .status attribute AND is a dict of headers
            resp_obj = self.Response(resp_headers, response.status_code)
            
            return resp_obj, response.content
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise

class CalendarAgent:
    def __init__(self):
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_path = os.path.join(self.root_dir, "data", "scheduled_interviews.xlsx")
        self.creds_path = os.path.join(self.root_dir, "credentials.json")
        self.token_path = os.path.join(self.root_dir, "token.json")
        self.creds = None
        self.service = None

    def authenticate(self):
        """Standard OAuth 2.0 flow for Google Calendar."""
        if os.path.exists(self.token_path):
            self.creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                if not os.path.exists(self.creds_path):
                    print("ERROR: credentials.json not found in root directory!")
                    print("Please download it from Google Cloud Console and place it in the project root.")
                    return False
                
                flow = InstalledAppFlow.from_client_secrets_file(self.creds_path, SCOPES)
                self.creds = flow.run_local_server(port=8080)
            
            # Save the credentials for the next run
            with open(self.token_path, 'w') as token:
                token.write(self.creds.to_json())

        try:
            # Use our custom RequestsHttp adapter instead of httplib2
            http = RequestsHttp(timeout=120)
            # We still need Google's auth logic to sign the requests
            # google_auth_httplib2.AuthorizedHttp wraps an 'http' object and adds headers.
            # It expects the wrapped object to have a .request() method returning (headers, content).
            # Our RequestsHttp does exactly that.
            authorized_http = google_auth_httplib2.AuthorizedHttp(self.creds, http=http)
            
            self.service = build('calendar', 'v3', http=authorized_http)
            return True
        except HttpError as error:
            print(f"An error occurred: {error}")
            return False

    def parse_datetime(self, date_str):
        """Parses DD-MM-YYYY HH:MM AM/PM string to datetime object."""
        try:
            # Example: 26-01-2026 10:00 AM
            return datetime.datetime.strptime(date_str, "%d-%m-%Y %I:%M %p")
        except ValueError:
            print(f"Error parsing date format: {date_str}. Expected 'DD-MM-YYYY HH:MM AM/PM'")
            return None

    def create_meeting(self, candidate_name, email, role, date_str):
        """Creates a Google Meet event."""
        if not self.service:
            return

        start_time = self.parse_datetime(date_str)
        if not start_time:
            print(f"Skipping {candidate_name}: Invalid Date {date_str}")
            return

        end_time = start_time + datetime.timedelta(hours=1)
        
        event = {
            'summary': f'Interview: {candidate_name} - {role}',
            'location': 'Google Meet',
            'description': f'Technical Interview for {role} at Agentic HR.',
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Asia/Kolkata',  # Adjust as needed or make configurable
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'Asia/Kolkata',
            },
            'attendees': [
                {'email': email},
            ],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},
                    {'method': 'popup', 'minutes': 10},
                ],
            },
            'guestsCanInviteOthers': True,
            'guestsCanSeeOtherGuests': True,
            'guestsCanModify': True,
            'visibility': 'public',
            'conferenceData': {
                'createRequest': {
                    'requestId': f"sample{datetime.datetime.now().timestamp()}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            },
        }

        try:
            event = self.service.events().insert(
                calendarId='primary', 
                body=event, 
                conferenceDataVersion=1,
                sendUpdates='all' # Sends email invite
            ).execute()
            
            link = event.get('hangoutLink')
            if not link and event.get('conferenceData'):
                # Fallback check
                for entry in event['conferenceData'].get('entryPoints', []):
                    if entry.get('entryPointType') == 'video':
                        link = entry.get('uri')
                        break
            
            print(f"Event created for {candidate_name}: {link}")
            return link
        except HttpError as error:
            print(f"An error occurred creating event for {candidate_name}: {error}")
            return None

    def process_interviews(self):
        print("--- Calendar Agent ---")
        if not self.authenticate():
            return

        if not os.path.exists(self.data_path):
            print(f"No scheduled interviews file found at {self.data_path}")
            return

        df = pd.read_excel(self.data_path)
        print(f"Found {len(df)} candidates to schedule.")
        
        final_schedule = []
        count = 0
        for index, row in df.iterrows():
            name = row.get('Candidate Name')
            email = row.get('Email')
            role = row.get('Role')
            time_str = row.get('Scheduled Time')
            
            # Basic validation
            if not isinstance(time_str, str) or not email or "@" not in email:
                print(f"Skipping {name}: Missing valid time/email.")
                continue

            print(f"Scheduling {name} for {time_str}...", end="\r")
            meet_link = self.create_meeting(name, email, role, time_str)
            
            if meet_link:
                final_schedule.append({
                    "Candidate Name": name,
                    "Role": role,
                    "Scheduled Time": time_str,
                    "Meeting Link": meet_link
                })
                count += 1
                
        print(f"\nScheduling complete. {count} invites sent.")
        
        if final_schedule:
            output_file = os.path.join(self.root_dir, "data", "final_interview_schedule.xlsx")
            try:
                pd.DataFrame(final_schedule).to_excel(output_file, index=False)
                print(f"Final schedule with links saved to: {output_file}")
            except Exception as e:
                print(f"Error saving final schedule: {e}")

if __name__ == "__main__":
    agent = CalendarAgent()
    agent.process_interviews()
