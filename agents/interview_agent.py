import os
import time
import requests
import json
import sys
from datetime import datetime, timedelta
import pandas as pd
from playwright.sync_api import sync_playwright
import schedule
from dotenv import load_dotenv

load_dotenv()


class GroqClient:
    """Direct Groq API client - no openai library needed."""
    
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.api_url = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
        
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in .env file!")
    
    def chat(self, messages, temperature=0.7, max_tokens=200):
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


class CaptionsListener:
    """Reads candidate responses from Google Meet live captions (DOM-based)."""
    
    def __init__(self):
        self.silence_threshold = 3.0 
        self.last_caption_text = ""
        self.agent_speaking = False  
        
        print("[CONFIG] Using Google Meet Live Captions for transcription")
    
    def enable_captions(self, page):
        """Enable live captions in Google Meet using Ctrl+C shortcut."""
        print("[CAPTIONS] Enabling live captions...")
        try:
            page.keyboard.press("c")
            time.sleep(1)
            print("[OK] Captions enabled")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to enable captions: {e}")
            return False
    
    def get_latest_caption(self, page):
        """Extract the latest caption text from Google Meet DOM."""
        selectors = [
            '[jsname="tgaKEf"] span',
            '.a4cQT',
            '[data-message-text]',
            '.iOzk7',
            '[jscontroller="LQRnv"] span'
        ]
        
        for selector in selectors:
            try:
                elements = page.query_selector_all(selector)
                if elements:
                    texts = []
                    for el in elements[-5:]:  
                        text = el.inner_text().strip()
                        if text:
                            texts.append(text)
                    
                    if texts:
                        return " ".join(texts)
            except Exception:
                continue
        
        return ""
    def extract_last_response(self, caption_text):
        """Extract only the LAST candidate response from accumulated captions."""
        lines = caption_text.split('\n')
        last_response_lines = []
        in_candidate_block = False
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped in {'language', 'English', 'format_size', 'Font size', 
                           'circle', 'Font color', 'settings', 'Open caption settings', 'You'}:
                if stripped == 'You':  
                    in_candidate_block = False
                    last_response_lines = []  
                continue
            words = stripped.split()
            if len(words) == 2 and all(w[0].isupper() for w in words if w):
                in_candidate_block = True
                last_response_lines = []  
                continue
            
            if in_candidate_block and stripped:
                last_response_lines.append(stripped)
        return ' '.join(last_response_lines).strip()
    
    def listen(self, page, timeout=120):
        """
        Listen for candidate response via captions.
        Returns only the LAST candidate response when silence is detected.
        """
        print(f"\n[LISTEN] Waiting for candidate response... (10s silence = done, timeout: {timeout}s)")
        
        start_time = time.time()
        last_change_time = None
        last_caption_full = ""
        last_extracted = ""
        speech_detected = False
        
        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                print(f"\n[TIMEOUT] No response detected after {timeout}s")
                return ""
            if self.agent_speaking:
                time.sleep(0.2)
                continue
            current_caption = self.get_latest_caption(page)
            
            if current_caption and current_caption != last_caption_full:
                extracted = self.extract_last_response(current_caption)
                
                if extracted and extracted != last_extracted:
                    if not speech_detected:
                        speech_detected = True
                        print("[DETECTED] Speech detected in captions!")
                    
                    last_extracted = extracted
                    last_change_time = time.time()
                    display = extracted[-60:] if len(extracted) > 60 else extracted
                    print(f"\r[CAPTION] ...{display}", end='', flush=True)
                
                last_caption_full = current_caption
            
            if speech_detected and last_change_time:
                silence_duration = time.time() - last_change_time
                
                if silence_duration >= self.silence_threshold:
                    print(f"\n[SILENCE] {silence_duration:.1f}s of silence. Response complete.")
                    return last_extracted
            
            time.sleep(0.1)
        
        return ""
    
    def set_agent_speaking(self, speaking: bool):
        """Set flag to ignore captions while agent is speaking."""
        self.agent_speaking = speaking


class InterviewAgent:
    def __init__(self):
        # Paths
        self.schedule_file = os.path.join(os.getcwd(), "data", "final_interview_schedule.xlsx")
        self.transcript_dir = os.path.join(os.getcwd(), "unverified_transcripts")
        os.makedirs(self.transcript_dir, exist_ok=True)
        
        self.groq = GroqClient()
        self.captions = CaptionsListener()  
        self.processed_meetings = set()
        
        print("\n" + "="*60)
        print("[START] INTERVIEW AGENT STARTED")
        print("="*60)
        print(f"[CONFIG] Schedule: {self.schedule_file}")
        print(f"[CONFIG] Transcripts: {self.transcript_dir}")
        print(f"[CONFIG] Schedule check: Every 1 minute")
        print(f"[CONFIG] Join: 5 minutes before meeting")
        print(f"[CONFIG] Interview starts: 1 min after meeting time")
        print(f"[CONFIG] Using Google Meet Live Captions (no audio)")
        print(f"[CONFIG] Silence threshold: {self.captions.silence_threshold}s")
        print("="*60 + "\n")
    
    def clean_caption_text(self, text):
        """Clean Google Meet caption noise from text."""
        noise_words = {
            'language', 'English', 'format_size', 'Font size', 
            'circle', 'Font color', 'settings', 'Open caption settings',
            'Hindi', 'Spanish', 'French', 'German', 'You'
        }
        
        lines = text.split('\n')
        cleaned = []
        for line in lines:
            stripped = line.strip()
            if stripped and stripped not in noise_words:
                words = stripped.split()
                if len(words) <= 2 and all(w[0].isupper() for w in words if w):
                    continue
                cleaned.append(stripped)
        
        return ' '.join(cleaned).strip()

    def speak(self, page, text):
        """Use browser TTS to speak. Enables mic, speaks, then disables mic."""
        print(f"[AGENT] {text}\n")
        self.captions.set_agent_speaking(True)
        print("[MIC] Enabling microphone...")
        page.keyboard.press("Control+d")
        time.sleep(0.5)
        
        safe_text = text.replace("'", "\\'").replace('"', '\\"').replace('\n', ' ')
        script = f"""
            const utterance = new SpeechSynthesisUtterance("{safe_text}");
            utterance.rate = 0.9;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        """
        try:
            page.evaluate(script)
            time.sleep(max(3, len(text.split()) * 0.4))
        except Exception as e:
            print(f"[ERROR] TTS error: {e}")
        finally:
            print("[MIC] Disabling microphone...")
            page.keyboard.press("Control+d")
            time.sleep(0.5)
            self.captions.set_agent_speaking(False)

    def conduct_interview(self, page, candidate_name, role):
        """Main interview loop using Google Meet captions."""
        print("\n" + "="*60)
        print(f"[INTERVIEW] STARTING: {candidate_name}")
        print(f"[ROLE] {role}")
        print("="*60 + "\n")
        print("[INFO] Enabling captions for the interview...")
        self.captions.enable_captions(page)
        time.sleep(1)
        system_prompt = f"""You are an AI interviewer at Agentic HR conducting an interview with {candidate_name} for the {role} position.

INTERVIEW GUIDELINES:
1. Start with a warm welcome and ask them to introduce themselves.
2. Ask ONE question at a time. Wait for their answer before proceeding.
3. Cover these topics naturally: background, skills, experience, role-specific questions, salary expectations, availability.
4. Keep responses short (1-2 sentences) for clear speech.
5. Be friendly, professional, and conversational.

CONCLUSION:
- When you have covered all important topics (background, skills, role questions, salary), conclude the interview naturally.
- If the candidate seems unresponsive or gives very short answers repeatedly, politely wrap up.
- To end the interview, include the exact phrase [END_INTERVIEW] at the end of your final message.

Example final message: "Thank you so much for your time today, {candidate_name}. We've covered everything we needed. Our team will review your application and get back to you soon. Have a great day! [END_INTERVIEW]"

No markdown in responses."""

        conversation = [{"role": "system", "content": system_prompt}]
        
        interview_start = time.time()
        max_duration_minutes = 40  
        max_duration_seconds = max_duration_minutes * 60
        
        greeting = self.groq.chat(conversation)
        if greeting:
            conversation.append({"role": "assistant", "content": greeting})
            self.speak(page, greeting.replace("[END_INTERVIEW]", ""))
        else:
            default_greeting = f"Hello {candidate_name}! Welcome to your interview for the {role} position. Please tell me about yourself."
            self.speak(page, default_greeting)
            conversation.append({"role": "assistant", "content": default_greeting})
        
        no_response_count = 0
        max_no_response = 3 
        turn = 0
        
        while True:
            turn += 1
            elapsed = time.time() - interview_start
            remaining_mins = (max_duration_seconds - elapsed) / 60
            
            print(f"\n--- Turn {turn} | Elapsed: {int(elapsed/60)}min | Remaining: {int(remaining_mins)}min ---")
            
            if elapsed >= max_duration_seconds:
                print("\n[TIME] 40 minutes reached, concluding interview...")
                break
            
            response = self.captions.listen(page, timeout=120)
            
            if not response:
                no_response_count += 1
                print(f"[WARN] No response detected (attempt {no_response_count}/{max_no_response})")
                
                if no_response_count >= max_no_response:
                    print("[WARN] Too many no-responses, ending interview")
                    break
                
                self.speak(page, "I didn't catch that. Please take your time and respond when you're ready.")
                continue
            
            no_response_count = 0
            
            cleaned_response = self.clean_caption_text(response)
            if not cleaned_response:
                print("[WARN] Response was all noise, asking to repeat")
                self.speak(page, "I didn't catch that clearly. Could you please repeat?")
                continue
            
            print(f"[CANDIDATE] {cleaned_response}\n")
            conversation.append({"role": "user", "content": cleaned_response})
            
            limited_conversation = [conversation[0]] + conversation[-8:] if len(conversation) > 9 else conversation
            reply = self.groq.chat(limited_conversation)
            if reply:
                conversation.append({"role": "assistant", "content": reply})
                
                if "[END_INTERVIEW]" in reply:
                    print("\n[LLM] Interview conclusion signaled")
                    clean_reply = reply.replace("[END_INTERVIEW]", "").strip()
                    self.speak(page, clean_reply)
                    break
                else:
                    self.speak(page, reply)
            else:
                print("[ERROR] Failed to generate reply")
                break
        
        if "[END_INTERVIEW]" not in str(conversation):
            closing = "Thank you so much for your time today. We've covered everything we needed. Our team will review your application and get back to you soon. Have a great day!"
            self.speak(page, closing)
            conversation.append({"role": "assistant", "content": closing})
        
        self.save_transcript(candidate_name, conversation)
        print("\n[OK] Interview complete!\n")

    def save_transcript(self, candidate_name, conversation):
        """Save conversation to file with email and role from current interview."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{candidate_name.replace(' ', '_')}_{timestamp}.txt"
        filepath = os.path.join(self.transcript_dir, filename)
        
        email = getattr(self, 'current_email', 'Not provided')
        role = getattr(self, 'current_role', 'Unknown')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"Interview Transcript: {candidate_name}\n")
            f.write(f"Email: {email}\n")
            f.write(f"Role: {role}\n")
            f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*60 + "\n\n")
            
            for msg in conversation:
                if msg["role"] == "system":
                    continue
                speaker = "Agent" if msg["role"] == "assistant" else "Candidate"
                f.write(f"{speaker}: {msg['content']}\n\n")
        
        print(f"[SAVED] Transcript: {filepath}")
        print(f"[INFO] Email saved: {email}")

    def check_schedule(self):
        """Check schedule and join if meeting is due."""
        now = datetime.now()
        print(f"\n[CHECK] Schedule check at {now.strftime('%H:%M:%S')}")
        
        if not os.path.exists(self.schedule_file):
            print(f"[ERROR] Schedule file not found: {self.schedule_file}")
            return
        
        try:
            df = pd.read_excel(self.schedule_file)
            
            for _, row in df.iterrows():
                candidate_name = str(row.get('Candidate Name', 'Unknown'))
                role = str(row.get('Role', 'Unknown'))
                scheduled_time_str = str(row.get('Scheduled Time', ''))
                meeting_link = str(row.get('Meeting Link', ''))
                
                candidate_email = str(row.get('Email', ''))
                if not candidate_email or candidate_email == 'nan':
                    try:
                        scheduled_df = pd.read_excel(os.path.join(os.getcwd(), "data", "scheduled_interviews.xlsx"))
                        match = scheduled_df[scheduled_df['Candidate Name'] == candidate_name]
                        if not match.empty:
                            candidate_email = str(match.iloc[0].get('Email', 'Not provided'))
                        else:
                            candidate_email = 'Not provided'
                    except:
                        candidate_email = 'Not provided'
                
                meeting_id = f"{candidate_name}_{scheduled_time_str}"
                if meeting_id in self.processed_meetings:
                    continue
                
                try:
                    scheduled_time = datetime.strptime(scheduled_time_str, "%d-%m-%Y %I:%M %p")
                except:
                    try:
                        scheduled_time = datetime.strptime(scheduled_time_str, "%Y-%m-%d %H:%M:%S")
                    except:
                        print(f"[WARN] Could not parse time: {scheduled_time_str}")
                        continue
                
                time_diff_minutes = (scheduled_time - now).total_seconds() / 60
                
                if 0 <= time_diff_minutes <= 5:
                    print(f"\n[MEETING FOUND]")
                    print(f"   Candidate: {candidate_name}")
                    print(f"   Email: {candidate_email}")
                    print(f"   Role: {role}")
                    print(f"   Scheduled: {scheduled_time_str}")
                    print(f"   Joining in: {time_diff_minutes:.1f} min")
                    
                    self.processed_meetings.add(meeting_id)
                    self.join_meeting(meeting_link, candidate_name, candidate_email, role, scheduled_time)
                    
        except Exception as e:
            print(f"[ERROR] Schedule error: {e}")

    def join_meeting(self, meeting_link, candidate_name, candidate_email, role, scheduled_time):
        """Join meeting, wait until 1 min after scheduled time, then conduct interview."""
        print(f"\n[JOIN] Joining meeting for {candidate_name} ({candidate_email})...")
        
        self.current_email = candidate_email
        self.current_role = role
        
        context = None
        p = None
        
        profile_dir = os.path.join(os.getcwd(), "browser_profile")
        
        try:
            p = sync_playwright().start()
            
            print(f"[INFO] Using persistent profile: {profile_dir}")
            context = p.chromium.launch_persistent_context(
                profile_dir,
                headless=False,
                args=[
                    '--use-fake-ui-for-media-stream',
                    '--disable-blink-features=AutomationControlled'
                ],
                permissions=['microphone', 'camera'],
                accept_downloads=True
            )
            
            page = context.pages[0] if context.pages else context.new_page()
            
            print(f"[NAV] Opening: {meeting_link}")
            page.goto(meeting_link)
            time.sleep(5)
            
            if "accounts.google.com" in page.url:
                print("\n" + "="*60)
                print("[LOGIN REQUIRED]")
                print("Please sign in to your Google account in the browser.")
                print("Your login will be saved for future sessions.")
                print("="*60 + "\n")
                
                for i in range(12):  # 12 x 5 = 60 seconds
                    time.sleep(5)
                    if "meet.google.com" in page.url:
                        print("[OK] Login successful!")
                        break
                    print(f"[WAIT] Waiting for login... {(24-i)*5}s remaining")
                else:
                    print("[ERROR] Login timeout")
                    return
            
            page.keyboard.press("Control+e") 
            time.sleep(1)
            page.keyboard.press("Control+d") 
            time.sleep(1)
            
            try:
                join_btn = page.locator("button:has-text('Join now'), button:has-text('Ask to join')").first
                join_btn.click(timeout=10000)
                print("[OK] Clicked join button")
            except:
                print("[WARN] Join button not found")
            
            time.sleep(3)
            print("[OK] In meeting!")
            
            interview_start_time = scheduled_time + timedelta(minutes=1)
            now = datetime.now()
            wait_seconds = (interview_start_time - now).total_seconds()
            
            if wait_seconds > 0:
                wait_minutes = wait_seconds / 60
                print(f"\n[WAIT] Meeting scheduled: {scheduled_time.strftime('%H:%M')}")
                print(f"       Interview starts: {interview_start_time.strftime('%H:%M')} (2 min after meeting)")
                print(f"       Waiting {wait_minutes:.1f} minutes...")
                
                while datetime.now() < interview_start_time:
                    remaining = (interview_start_time - datetime.now()).total_seconds()
                    if remaining > 60:
                        print(f"       {int(remaining/60)} minutes remaining...")
                        time.sleep(60)
                    else:
                        print(f"       {int(remaining)} seconds remaining...")
                        time.sleep(remaining)
                        break
            else:
                print("[INFO] Already past interview start time, starting now...")
            
            print("\n[START] Starting interview...")
            
            self.conduct_interview(page, candidate_name, role)
            
            print("[LEAVE] Leaving meeting...")
            page.keyboard.press("Control+h")
            time.sleep(2)
            
        except Exception as e:
            print(f"[ERROR] Meeting error: {e}")
        finally:
            if context:
                context.close()
            if p:
                p.stop()

    def run(self):
        """Main loop - checks schedule every 1 minute."""
        print("[RUN] Agent running. Press Ctrl+C to stop.\n")
        
        self.check_schedule()
        schedule.every(1).minutes.do(self.check_schedule)
        
        while True:
            schedule.run_pending()
            time.sleep(1)


if __name__ == "__main__":
    agent = InterviewAgent()
    agent.run()

