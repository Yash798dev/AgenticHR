# Agentic HR Platform

Full MEAN stack platform connecting to Python AI agents for automated hiring.

## Quick Start

### 1. Start Agent Bridge (Python FastAPI)
```bash
cd platform/agent-bridge
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### 2. Start Backend (Node.js/Express)
```bash
cd platform/backend
npm install
# Copy .env.example to .env and configure
npm run dev
# Runs on http://localhost:5000
```

### 3. Start Frontend (Angular)
```bash
cd platform/frontend
npm install
npm start
# Runs on http://localhost:4200
```

## Architecture

```
platform/
├── agent-bridge/     # Python FastAPI → connects to agents
├── backend/          # Node.js/Express API
│   └── src/
│       ├── models/   # User, Org, Workflow, Job, Subscription
│       ├── routes/   # Auth, Workflows, Jobs, Billing
│       └── middleware/
└── frontend/         # Angular 17 SPA
    └── src/app/
        ├── core/     # Services, Guards, Interceptors
        └── features/ # Dashboard, Workflows, Jobs, Billing
```

## Features

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based (Admin, Manager, Recruiter)
- **Workflows**: Step-by-step agent execution with status tracking
- **Jobs**: CRUD with pipeline statistics
- **Billing**: Subscription plans with usage limits
