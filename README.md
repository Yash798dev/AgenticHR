# 🤖 AgenticHR - AI-Powered Recruitment Automation Platform

**AgenticHR** is a comprehensive, multi-agent AI system that automates the entire recruitment pipeline—from resume screening to offer letter generation. Built with Python AI agents, a MEAN stack platform, and a stunning 3D marketing website.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
- [Detailed Setup Instructions](#detailed-setup-instructions)
  - [1. Python AI Agents (Core System)](#1-python-ai-agents-core-system)
  - [2. Platform (MEAN Stack)](#2-platform-mean-stack)
  - [3. Marketing Website (3D Portfolio)](#3-marketing-website-3d-portfolio)
- [Running with ngrok](#running-with-ngrok)
- [Environment Variables](#environment-variables)
- [Agent Workflow](#agent-workflow)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Tech Stack](#tech-stack)

---

## 🎯 Overview

AgenticHR automates recruitment through 7 intelligent AI agents:

1. **Resume Screener** - Filters candidates using LLM-based evaluation
2. **Voice Caller** - Calls candidates via Twilio with AI conversation
3. **Scheduler** - Extracts interview schedules from call transcripts
4. **Calendar Agent** - Creates Google Meet events automatically
5. **Interview Agent** - Conducts AI interviews on Google Meet
6. **Transcript Scorer** - Scores interview performance with LLM
7. **Offer Letter Agent** - Generates and emails offer letters

---

## 📁 Project Structure

```
AgenticHR/
├── agents/                      # 🤖 Python AI Agents (Core)
│   ├── resume_screener.py
│   ├── voice_caller.py
│   ├── voice_server.py         # FastAPI server for Twilio
│   ├── scheduler.py
│   ├── calendar_agent.py
│   ├── interview_agent.py
│   ├── transcript_scorer_agent.py
│   ├── offer_letter_agent.py
│   └── transcripts/            # Call transcripts storage
│
├── platform/                    # 🌐 MEAN Stack Platform
│   ├── agent-bridge/           # Python FastAPI bridge
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── backend/                # Node.js/Express API
│   │   ├── src/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── middleware/
│   │   └── package.json
│   └── frontend/               # Angular 17 SPA
│       ├── src/app/
│       │   ├── core/
│       │   └── features/
│       └── package.json
│
├── website/                     # ✨ 3D Marketing Website
│   ├── src/
│   │   ├── components/
│   │   └── styles/
│   └── package.json
│
├── data/                        # 📊 Generated data files
├── offer_letters/              # 📄 Generated PDFs
├── unverified_transcripts/     # 🎤 Interview recordings
├── verified_transcripts/       # ✅ Processed transcripts
├── app.py                      # 🎨 Streamlit UI (Main Entry)
├── requirements.txt            # Python dependencies
├── .env                        # Environment configuration
└── credentials.json            # Google Calendar API credentials
```

---

## ⚙️ Prerequisites

### Required Software

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **MongoDB** - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- **ngrok** - [Download](https://ngrok.com/download) (for Twilio webhooks)

### Required API Keys

1. **Groq API** - [Get Key](https://console.groq.com/) (Free LLM API)
2. **Twilio** - [Sign Up](https://www.twilio.com/try-twilio) (Voice calls)
3. **AssemblyAI** - [Get Key](https://www.assemblyai.com/) (Transcription)
4. **Google Calendar API** - [Enable API](https://console.cloud.google.com/)
5. **Gmail SMTP** - [App Password](https://support.google.com/accounts/answer/185833)
6. **MongoDB Atlas** - [Create Cluster](https://www.mongodb.com/cloud/atlas/register)

---

## 🚀 Quick Start Guide

### 1. Clone and Install

```bash
# Clone the repository
cd C:\Users\yashw\Desktop\AgenticHR

# Create Python virtual environment
python -m venv venv
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers (for interview agent)
playwright install chromium
```

### 2. Configure Environment

Copy the `.env` file and update with your API keys:

```bash
# Already exists at root - update with your keys
notepad .env
```

### 3. Run the Main Application

```bash
# Activate virtual environment
venv\Scripts\activate

# Run Streamlit UI
streamlit run app.py
```

Open **http://localhost:8501** in your browser.

---

## 📖 Detailed Setup Instructions

### 1. Python AI Agents (Core System)

#### Step 1.1: Install Dependencies

```bash
cd C:\Users\yashw\Desktop\AgenticHR

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install all Python packages
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

#### Step 1.2: Configure Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Create **OAuth 2.0 credentials** (Desktop app)
5. Download credentials as `credentials.json`
6. Place `credentials.json` in the root directory

#### Step 1.3: Run Voice Server with ngrok

The voice server handles Twilio callbacks for AI phone calls.

**Terminal 1 - Start Voice Server:**

```bash
cd C:\Users\yashw\Desktop\AgenticHR
venv\Scripts\activate
python agents\voice_server.py
```

Server runs on **http://localhost:8000**

**Terminal 2 - Start ngrok:**

```bash
# Download ngrok from https://ngrok.com/download
# Extract and run:
ngrok http 8000
```

**Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`) - you'll need this for Twilio configuration.

#### Step 1.4: Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click your Twilio phone number
4. Under **Voice Configuration**:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://your-ngrok-url.ngrok.io/voice`
   - **HTTP**: POST
5. Save configuration

#### Step 1.5: Run Main Streamlit Application

```bash
cd C:\Users\yashw\Desktop\AgenticHR
venv\Scripts\activate
streamlit run app.py
```

Open **http://localhost:8501** and follow the step-by-step workflow.

---

### 2. Platform (MEAN Stack)

The platform provides a production-ready web interface with authentication, workflows, and billing.

#### Step 2.1: Start Agent Bridge (Python FastAPI)

**Terminal 3:**

```bash
cd C:\Users\yashw\Desktop\AgenticHR\platform\agent-bridge

# Install dependencies
pip install -r requirements.txt

# Run FastAPI server
python main.py
```

Runs on **http://localhost:8000** (or 8001 if voice_server is on 8000)

#### Step 2.2: Start Backend (Node.js/Express)

**Terminal 4:**

```bash
cd C:\Users\yashw\Desktop\AgenticHR\platform\backend

# Install dependencies
npm install

# Configure environment
# Edit .env file with your MongoDB URI and JWT secrets
notepad .env

# Run development server
npm run dev
```

Runs on **http://localhost:5000**

**Backend Environment Variables:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agentic-hr
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRE=30d
AGENT_BRIDGE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:4200
```

#### Step 2.3: Start Frontend (Angular)

**Terminal 5:**

```bash
cd C:\Users\yashw\Desktop\AgenticHR\platform\frontend

# Install dependencies
npm install

# Run development server
npm start
```

Runs on **http://localhost:4200**

**Access the Platform:**

- Navigate to **http://localhost:4200**
- Register a new account
- Login and access the dashboard
- Create workflows and manage jobs

---

### 3. Marketing Website (3D Portfolio)

The marketing website showcases AgenticHR with stunning 3D visualizations.

**Terminal 6:**

```bash
cd C:\Users\yashw\Desktop\AgenticHR\website

# Install dependencies
npm install

# Run development server
npm run dev
```

Runs on **http://localhost:5173**

**Build for Production:**

```bash
npm run build
# Deploy the dist/ folder to Vercel, Netlify, etc.
```

---

## 🔗 Running with ngrok

ngrok is **required** for the Voice Caller agent to receive Twilio webhooks.

### Setup ngrok

1. **Download ngrok:**
   - Visit [https://ngrok.com/download](https://ngrok.com/download)
   - Download Windows version
   - Extract `ngrok.exe` to a folder (e.g., `C:\ngrok\`)

2. **Sign up and get auth token:**
   - Create account at [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
   - Copy your auth token from dashboard
   - Run: `ngrok authtoken YOUR_AUTH_TOKEN`

3. **Start ngrok tunnel:**

   ```bash
   # Make sure voice_server.py is running on port 8000
   ngrok http 8000
   ```

4. **Copy the forwarding URL:**

   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:8000
   ```

   Use `https://abc123.ngrok.io` as your voice server URL.

5. **Update Twilio webhook:**
   - Twilio Console → Phone Numbers → Your Number
   - Voice webhook URL: `https://abc123.ngrok.io/voice`

### Running Complete System with ngrok

**Terminal Layout:**

```
Terminal 1: Voice Server
cd C:\Users\yashw\Desktop\AgenticHR
venv\Scripts\activate
python agents\voice_server.py

Terminal 2: ngrok
ngrok http 8000

Terminal 3: Streamlit (Main UI)
cd C:\Users\yashw\Desktop\AgenticHR
venv\Scripts\activate
streamlit run app.py

Terminal 4: Platform Backend (Optional)
cd C:\Users\yashw\Desktop\AgenticHR\platform\backend
npm run dev

Terminal 5: Platform Frontend (Optional)
cd C:\Users\yashw\Desktop\AgenticHR\platform\frontend
npm start

Terminal 6: Marketing Website (Optional)
cd C:\Users\yashw\Desktop\AgenticHR\website
npm run dev
```

---

## 🔐 Environment Variables

### Root `.env` File

Located at: `C:\Users\yashw\Desktop\AgenticHR\.env`

```env
# Groq LLM API
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-8b-instant

# AssemblyAI (Transcription)
ASSEMBLYAI_API_KEY=your_assemblyai_key_here

# Twilio (Voice Calls)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Gmail SMTP (Offer Letters)
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password-here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

### Platform Backend `.env`

Located at: `C:\Users\yashw\Desktop\AgenticHR\platform\backend\.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agentic-hr
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRE=30d
AGENT_BRIDGE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:4200
STRIPE_SECRET_KEY=sk_test_your_stripe_key (optional)
```

---

## 🔄 Agent Workflow

### Complete Recruitment Pipeline

```mermaid
graph TD
    A[Upload Resumes CSV] --> B[Resume Screener]
    B --> C[Shortlisted Candidates]
    C --> D[Voice Caller via Twilio]
    D --> E[Call Transcripts]
    E --> F[Scheduler Agent]
    F --> G[Scheduled Interviews]
    G --> H[Calendar Agent]
    H --> I[Google Meet Links]
    I --> J[Interview Agent]
    J --> K[Interview Transcripts]
    K --> L[Transcript Scorer]
    L --> M[Candidate Scores]
    M --> N[Offer Letter Agent]
    N --> O[Offer Letters Sent]
```

### Step-by-Step Process

1. **Resume Screener**
   - Input: `Applicants_Data.csv`
   - Evaluates candidates against job criteria using LLM
   - Output: `data/shortlisted_J001.xlsx`

2. **Voice Caller**
   - Calls shortlisted candidates via Twilio
   - AI conversation: greeting, salary negotiation, scheduling
   - Saves transcripts to `agents/transcripts/`

3. **Scheduler**
   - Parses call transcripts to extract interview times
   - Output: `data/scheduled_interviews.xlsx`

4. **Calendar Agent**
   - Creates Google Calendar events with Meet links
   - Updates `data/scheduled_interviews.xlsx` with meeting URLs

5. **Interview Agent**
   - Monitors Google Calendar for upcoming meetings
   - Joins Google Meet automatically
   - Conducts technical interview with AI
   - Records audio and generates transcript

6. **Transcript Scorer**
   - Scores interview transcripts using LLM
   - Evaluates technical skills, communication, problem-solving
   - Output: `data/interview_scores.xlsx`

7. **Offer Letter Agent**
   - Generates PDF offer letters for recommended candidates
   - Sends via email with attachments
   - Output: `offer_letters/*.pdf` and `data/sent_offers.xlsx`

---

## ✨ Features

### Core Features

- ✅ **Automated Resume Screening** - LLM-based candidate evaluation
- ✅ **AI Voice Calls** - Twilio integration with conversational AI
- ✅ **Smart Scheduling** - NLP-based time extraction from conversations
- ✅ **Google Calendar Integration** - Automatic meeting creation
- ✅ **AI Interview Conductor** - Automated Google Meet interviews
- ✅ **Intelligent Scoring** - LLM-based transcript evaluation
- ✅ **Offer Letter Generation** - PDF creation and email delivery

### Platform Features

- 🔐 **JWT Authentication** - Secure login with refresh tokens
- 👥 **Role-Based Access** - Admin, Manager, Recruiter roles
- 📊 **Workflow Management** - Visual step-by-step execution
- 💼 **Job Pipeline** - Track candidates through hiring stages
- 💳 **Subscription Billing** - Stripe integration (optional)
- 📈 **Analytics Dashboard** - Real-time recruitment metrics

### Website Features

- 🎨 **3D Visualizations** - React Three Fiber animations
- ✨ **Cinematic Effects** - Bloom, vignette, chromatic aberration
- 📱 **Responsive Design** - Desktop and mobile optimized
- 🚀 **High Performance** - 60fps target with optimizations

---

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error

```
Error: ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

- Use MongoDB Atlas (cloud) instead of local MongoDB
- Update `MONGODB_URI` in `platform/backend/.env`
- Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

#### 2. Twilio Webhook Not Working

**Solution:**

- Ensure `voice_server.py` is running
- Ensure ngrok is running and forwarding to port 8000
- Update Twilio webhook URL with current ngrok URL (changes on restart)
- Check ngrok web interface at `http://localhost:4040` for request logs

#### 3. Google Calendar API Error

```
Error: credentials.json not found
```

**Solution:**

- Download OAuth credentials from Google Cloud Console
- Save as `credentials.json` in project root
- Run any calendar agent - it will open browser for authorization
- `token.json` will be created after first authorization

#### 4. Playwright Browser Not Found

```
Error: Executable doesn't exist
```

**Solution:**

```bash
playwright install chromium
```

#### 5. Port Already in Use

```
Error: Port 8000 is already in use
```

**Solution:**

- Check if voice_server.py or agent-bridge is already running
- Kill the process or use a different port
- Update port in code and ngrok command

#### 6. Python Module Not Found

```
ModuleNotFoundError: No module named 'xyz'
```

**Solution:**

```bash
venv\Scripts\activate
pip install -r requirements.txt
```

---

## 🛠️ Tech Stack

### Python AI Agents

- **LangGraph** - Agent orchestration
- **LangChain** - LLM framework
- **Groq** - Fast LLM inference
- **Streamlit** - Web UI
- **Twilio** - Voice calls
- **AssemblyAI** - Speech-to-text
- **Playwright** - Browser automation
- **Google Calendar API** - Meeting scheduling
- **ReportLab** - PDF generation

### Platform

- **Angular 17** - Frontend framework
- **Node.js/Express** - Backend API
- **MongoDB** - Database
- **JWT** - Authentication
- **FastAPI** - Python bridge
- **Stripe** - Payment processing

### Marketing Website

- **React 18** - UI library
- **Vite** - Build tool
- **React Three Fiber** - 3D rendering
- **GSAP** - Animations
- **Zustand** - State management

---

## 📝 Usage Example

### Running a Complete Recruitment Cycle

1. **Prepare candidate data:**
   - Add resumes to `Applicants_Data.csv`

2. **Start all services:**

   ```bash
   # Terminal 1: Voice Server
   python agents\voice_server.py

   # Terminal 2: ngrok
   ngrok http 8000

   # Terminal 3: Main UI
   streamlit run app.py
   ```

3. **Configure job in Streamlit:**
   - Job ID: `J001`
   - Role: `Python Developer`
   - Min Experience: `2 years`
   - Location: `Bangalore`
   - Salary Range: `8-12 LPA`
   - Server URL: `https://your-ngrok-url.ngrok.io`

4. **Execute workflow:**
   - Click through each step in the Streamlit UI
   - Monitor progress in sidebar
   - Review results at each stage

5. **Review outputs:**
   - Shortlisted: `data/shortlisted_J001.xlsx`
   - Scores: `data/interview_scores.xlsx`
   - Offers: `offer_letters/*.pdf`

---

## 📄 License

This project is for educational and demonstration purposes.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

## 📧 Support

For questions or issues, please create an issue in the repository.

---

**Built with ❤️ using AI Agents and Modern Web Technologies**
