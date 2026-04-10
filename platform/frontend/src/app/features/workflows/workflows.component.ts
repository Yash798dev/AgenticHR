import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface WorkflowStep {
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  taskId?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

interface Workflow {
  _id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  steps: WorkflowStep[];
  job: any;
  stats: any;
  createdAt: Date;
}

interface Job {
  _id: string;
  jobId: string;
  title: string;
  role: string;
  requirements?: any;
}

const AGENT_CONFIG = [
  { key: 'resume_screener', name: 'Resume Screener', icon: '📄', desc: 'Screen resumes from uploaded data' },
  { key: 'voice_caller', name: 'Voice Caller', icon: '📞', desc: 'Call shortlisted candidates via Twilio' },
  { key: 'calendar_agent', name: 'Calendar Agent', icon: '📅', desc: 'Schedule interviews via Google Calendar' },
  { key: 'interview_agent', name: 'Interview Agent', icon: '🎥', desc: 'Conduct AI video interviews' },
  { key: 'transcript_scorer', name: 'Transcript Scorer', icon: '📊', desc: 'Score interview transcripts' },
  { key: 'offer_letter', name: 'Offer Letter', icon: '✉️', desc: 'Generate and send offer letters' }
];

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="workflows-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <h1>Hiring Workflows</h1>
          <p class="subtitle">Run AI agents step-by-step</p>
        </div>
        <button class="btn-primary" (click)="showCreateWizard = true">
          + New Workflow
        </button>
      </header>
      
      <div class="main-grid">
        <!-- Left: Workflow List -->
        <aside class="workflow-sidebar">
          <div class="sidebar-header">
            <span>Your Workflows</span>
          </div>
          
          <div class="workflow-list">
            <div class="workflow-item" 
                 *ngFor="let w of workflows()"
                 [class.active]="selected()?._id === w._id"
                 (click)="selectWorkflow(w)">
              <div class="wf-info">
                <strong>{{ w.name }}</strong>
                <small>{{ w.job?.title }}</small>
              </div>
              <span class="status-dot" [class]="w.status"></span>
            </div>
            
            <p class="empty" *ngIf="!workflows().length">
              No workflows yet
            </p>
          </div>
        </aside>
        
        <!-- Right: Workflow Detail -->
        <main class="workflow-main" *ngIf="selected(); else noSelection">
          <div class="workflow-header">
            <div>
              <h2>{{ selected()?.name }}</h2>
              <p>{{ selected()?.job?.title }} • {{ selected()?.job?.jobId }}</p>
            </div>
            <span class="status-badge" [class]="selected()?.status">
              {{ selected()?.status }}
            </span>
          </div>
          
          <!-- Stats Bar -->
          <div class="stats-bar">
            <div class="stat">
              <strong>{{ selected()?.stats?.totalCandidates || 0 }}</strong>
              <span>Total</span>
            </div>
            <div class="stat">
              <strong>{{ selected()?.stats?.shortlisted || 0 }}</strong>
              <span>Screened</span>
            </div>
            <div class="stat">
              <strong>{{ selected()?.stats?.interviewed || 0 }}</strong>
              <span>Interviewed</span>
            </div>
            <div class="stat">
              <strong>{{ selected()?.stats?.offered || 0 }}</strong>
              <span>Offered</span>
            </div>
          </div>
          
          <!-- Agent Pipeline -->
          <h3 class="section-title">Agent Pipeline</h3>
          <div class="agents-list">
            <div class="agent-card" 
                 *ngFor="let step of selected()?.steps; let i = index"
                 [class.current]="i === selected()?.currentStep"
                 [class.completed]="step.status === 'completed'"
                 [class.running]="step.status === 'running'"
                 [class.failed]="step.status === 'failed'">
              
              <div class="agent-num">{{ i + 1 }}</div>
              
              <div class="agent-icon">{{ getAgentConfig(step.agent).icon }}</div>
              
              <div class="agent-info">
                <strong>{{ getAgentConfig(step.agent).name }}</strong>
                <p>{{ getAgentConfig(step.agent).desc }}</p>
                
                <!-- Agent-specific inputs -->
                <div class="agent-inputs" *ngIf="i === selected()?.currentStep && step.status !== 'running'">
                  <!-- Voice Caller needs server URL -->
                  <div *ngIf="step.agent === 'voice_caller'" class="input-row">
                    <input [(ngModel)]="voiceServerUrl" placeholder="Ngrok server URL (e.g., https://xyz.ngrok.app)">
                  </div>
                  
                  <!-- Offer Letter needs candidate list -->
                  <div *ngIf="step.agent === 'offer_letter'" class="candidates-table-container">
                    <button class="btn-refresh" (click)="loadOfferCandidates()">↻ Refresh Candidates</button>
                    <table class="candidates-table" *ngIf="offerCandidates.length > 0">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Score</th>
                          <th>Rec.</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let candidate of offerCandidates">
                          <td>
                            <strong>{{ candidate.name }}</strong>
                            <small>{{ candidate.email }}</small>
                          </td>
                          <td>{{ candidate.score }}</td>
                          <td>
                            <span class="rec-badge" [class.success]="candidate.recommendation === 'Strongly Recommend' || candidate.recommendation === 'Recommend'" [class.warning]="candidate.recommendation === 'Consider'">
                              {{ candidate.recommendation }}
                            </span>
                          </td>
                          <td>
                            <span class="status-text" [class.completed]="candidate.status === 'Sent'" [class.failed]="candidate.status === 'Rejected'">{{ candidate.status }}</span>
                          </td>
                          <td class="action-cell">
                            <button *ngIf="candidate.status === 'Pending'" class="btn-sm btn-accept" (click)="processCandidate(candidate, 'accept')" [disabled]="candidate.processing">Accept</button>
                            <button *ngIf="candidate.status === 'Pending'" class="btn-sm btn-reject" (click)="processCandidate(candidate, 'reject')" [disabled]="candidate.processing">Reject</button>
                            <span *ngIf="candidate.processing" class="spinner-sm"></span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="empty" *ngIf="offerCandidates.length === 0">No eligible candidates available yet or waiting to load...</p>
                    
                    <button class="btn-run alt" style="margin-top: 1rem;" (click)="markOfferStepComplete()">
                       End Offer Step
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="agent-status">
                <span class="status-text" [class]="step.status">{{ step.status }}</span>
                
                <!-- Run button for current step -->
                <button class="btn-run" 
                        *ngIf="i === selected()?.currentStep && step.status !== 'completed' && step.status !== 'running' && step.agent !== 'offer_letter'"
                        (click)="runCurrentStep()"
                        [disabled]="isRunning()">
                  {{ step.status === 'failed' ? '↺ Retry' : '▶ Run' }}
                </button>
                
                <!-- Running spinner -->
                <div class="spinner" *ngIf="step.status === 'running'"></div>
                
                <!-- Completed result -->
                <span class="result" *ngIf="step.result">
                  {{ formatResult(step.result) }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Interview Agent Live Status Panel -->
          <div class="interview-live-panel" *ngIf="interviewLogs.length > 0">
            <div class="live-header">
              <span class="live-dot" [class.active]="interviewState === 'monitoring' || interviewState === 'joining' || interviewState === 'interviewing'"></span>
              <strong>Interview Agent</strong>
              <span class="live-state">
                {{ interviewState === 'monitoring' ? '🔍 Monitoring Schedule' : 
                   interviewState === 'joining' ? '🚀 Joining Meeting' : 
                   interviewState === 'interviewing' ? '🎤 Interview In Progress' :
                   interviewState === 'not_started' ? '⏸ Not Started' : '⏳ ' + interviewState }}
              </span>
              <span class="live-candidate" *ngIf="interviewCandidate">• {{ interviewCandidate }}</span>
            </div>
            <div class="live-logs" id="interviewLogs">
              <div class="log-entry" *ngFor="let log of interviewLogs" [class]="'log-' + log.type">
                <span class="log-time">{{ log.timestamp }}</span>
                <span class="log-icon">
                  {{ log.type === 'success' ? '✅' : log.type === 'warning' ? '⚠️' : log.type === 'error' ? '❌' : '▸' }}
                </span>
                <span class="log-msg">{{ log.message }}</span>
              </div>
            </div>
          </div>
          
          <!-- Advance Button -->
          <div class="advance-section" *ngIf="canAdvance()">
            <button class="btn-advance" (click)="advanceToNext()">
              Advance to Next Step →
            </button>
          </div>
        </main>
        
        <ng-template #noSelection>
          <main class="workflow-empty">
            <div class="empty-state">
              <span class="empty-icon">◆</span>
              <h3>Select a workflow</h3>
              <p>Or create a new one to get started</p>
            </div>
          </main>
        </ng-template>
      </div>
      
      <!-- Create Wizard Modal -->
      <div class="modal-overlay" *ngIf="showCreateWizard" (click)="showCreateWizard = false">
        <div class="modal wizard" (click)="$event.stopPropagation()">
          <div class="wizard-header">
            <h2>Create New Workflow</h2>
            <span class="step-indicator">Step {{ wizardStep }} of 3</span>
          </div>
          
          <!-- Step 1: Upload File -->
          <div class="wizard-step" *ngIf="wizardStep === 1">
            <h3>📁 Upload Applications Data</h3>
            <p>Upload your Excel file with candidate applications</p>
            
            <div class="upload-area" 
                 [class.dragover]="isDragover"
                 (dragover)="onDragOver($event)"
                 (dragleave)="isDragover = false"
                 (drop)="onDrop($event)">
              <input type="file" #fileInput 
                     accept=".xlsx,.xls,.csv" 
                     (change)="onFileSelect($event)"
                     style="display:none">
              
              <div *ngIf="!uploadedFile" class="upload-content" (click)="fileInput.click()">
                <span class="upload-icon">📤</span>
                <p>Drag & drop or click to upload</p>
                <small>Excel (.xlsx, .xls) or CSV files</small>
              </div>
              
              <div *ngIf="uploadedFile" class="file-selected">
                <span class="file-icon">📊</span>
                <div>
                  <strong>{{ uploadedFile.name }}</strong>
                  <small>{{ (uploadedFile.size / 1024).toFixed(1) }} KB</small>
                </div>
                <button class="btn-remove" (click)="uploadedFile = null">✕</button>
              </div>
            </div>
            
            <div class="upload-status" *ngIf="uploadStatus">
              <span [class]="uploadStatus.type">{{ uploadStatus.message }}</span>
            </div>
          </div>
          
          <!-- Step 2: Job Details -->
          <div class="wizard-step" *ngIf="wizardStep === 2">
            <h3>💼 Job Details</h3>
            <p>Enter the job requirements for screening</p>
            
            <div class="form-grid">
              <div class="form-group">
                <label>Job Title</label>
                <input [(ngModel)]="newJob.title" placeholder="e.g., Senior Python Developer">
              </div>
              <div class="form-group">
                <label>Role</label>
                <input [(ngModel)]="newJob.role" placeholder="e.g., Python Developer">
              </div>
              <div class="form-group">
                <label>Min Experience (years)</label>
                <input type="number" [(ngModel)]="newJob.minExperience" placeholder="2">
              </div>
              <div class="form-group">
                <label>Location</label>
                <input [(ngModel)]="newJob.location" placeholder="e.g., Bangalore">
              </div>
              <div class="form-group full">
                <label>Salary Range</label>
                <input [(ngModel)]="newJob.salaryRange" placeholder="e.g., 10-15 LPA">
              </div>
            </div>
          </div>
          
          <!-- Step 3: Workflow Name -->
          <div class="wizard-step" *ngIf="wizardStep === 3">
            <h3>🚀 Name Your Workflow</h3>
            <p>Give this hiring workflow a name</p>
            
            <div class="form-group large">
              <input [(ngModel)]="workflowName" 
                     placeholder="e.g., Q1 2026 Python Developer Hiring"
                     class="large-input">
            </div>
            
            <div class="summary-card">
              <h4>Summary</h4>
              <p><strong>Job:</strong> {{ newJob.title }}</p>
              <p><strong>Experience:</strong> {{ newJob.minExperience }}+ years</p>
              <p><strong>Location:</strong> {{ newJob.location }}</p>
              <p><strong>Salary:</strong> {{ newJob.salaryRange }}</p>
            </div>
          </div>
          
          <div class="wizard-actions">
            <button class="btn-back" *ngIf="wizardStep > 1" (click)="wizardStep = wizardStep - 1">
              ← Back
            </button>
            <div class="spacer"></div>
            <button class="btn-cancel" (click)="showCreateWizard = false">Cancel</button>
            <button class="btn-next" *ngIf="wizardStep < 3" (click)="nextWizardStep()">
              Next →
            </button>
            <button class="btn-create" *ngIf="wizardStep === 3" (click)="createWorkflow()">
              Create Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workflows-page {
      min-height: 100vh;
      background: #0a0a0a;
      color: #fff;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #1a1a1a;
    }
    
    .page-header h1 { font-size: 1.5rem; font-weight: 600; }
    .subtitle { color: #666; font-size: 0.9rem; margin-top: 0.25rem; }
    
    .btn-primary {
      padding: 0.75rem 1.5rem;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .main-grid {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: calc(100vh - 80px);
    }
    
    .workflow-sidebar {
      background: #0d0d0d;
      border-right: 1px solid #1a1a1a;
    }
    
    .sidebar-header {
      padding: 1rem 1.25rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #666;
      border-bottom: 1px solid #1a1a1a;
    }
    
    .workflow-list {
      padding: 0.5rem;
    }
    
    .workflow-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 0.25rem;
    }
    
    .workflow-item:hover { background: #1a1a1a; }
    .workflow-item.active { background: #1f1f1f; border: 1px solid #333; }
    
    .wf-info strong { display: block; font-size: 0.9rem; }
    .wf-info small { color: #666; font-size: 0.75rem; }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #444;
    }
    .status-dot.active { background: #4ade80; }
    .status-dot.completed { background: #3b82f6; }
    .status-dot.failed { background: #ef4444; }
    
    .workflow-main {
      padding: 2rem;
    }
    
    .workflow-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }
    
    .workflow-header h2 { font-size: 1.35rem; }
    .workflow-header p { color: #666; font-size: 0.9rem; margin-top: 0.25rem; }
    
    .status-badge {
      padding: 0.4rem 0.875rem;
      border-radius: 4px;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #1a1a1a;
    }
    .status-badge.active { color: #4ade80; }
    .status-badge.completed { color: #3b82f6; }
    .status-badge.draft { color: #888; }
    
    .stats-bar {
      display: flex;
      gap: 2.5rem;
      padding: 1.25rem 1.5rem;
      background: #111;
      border: 1px solid #1a1a1a;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    
    .stat strong { display: block; font-size: 1.5rem; font-weight: 600; }
    .stat span { font-size: 0.75rem; color: #666; }
    
    .section-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #666;
      margin-bottom: 1rem;
    }
    
    .agents-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .agent-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      background: #111;
      border: 1px solid #1a1a1a;
      border-radius: 8px;
      opacity: 0.5;
      transition: all 0.2s;
    }
    
    .agent-card.current {
      opacity: 1;
      border-color: #333;
      background: #151515;
    }
    
    .agent-card.completed {
      opacity: 1;
      border-left: 3px solid #4ade80;
    }
    
    .agent-card.running {
      opacity: 1;
      border-left: 3px solid #3b82f6;
      animation: glow 2s infinite;
    }
    
    .agent-card.failed {
      opacity: 1;
      border-left: 3px solid #ef4444;
    }
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
    }
    
    .agent-num {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #222;
      border-radius: 50%;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .agent-icon {
      font-size: 1.5rem;
    }
    
    .agent-info {
      flex: 1;
    }
    
    .agent-info strong { font-size: 1rem; }
    .agent-info p { color: #888; font-size: 0.85rem; margin-top: 0.25rem; }
    
    .agent-inputs {
      margin-top: 0.75rem;
    }
    
    .input-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .input-row input {
      padding: 0.5rem 0.75rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #fff;
      font-size: 0.85rem;
      min-width: 180px;
    }
    
    .agent-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
    }
    
    .status-text {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
    }
    .status-text.completed { color: #4ade80; }
    .status-text.running { color: #3b82f6; }
    .status-text.failed { color: #ef4444; }
    
    .btn-run {
      padding: 0.5rem 1rem;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    
    .btn-run:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #333;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .result {
      font-size: 0.8rem;
      color: #4ade80;
    }
    
    /* Interview Agent Live Status Panel */
    .interview-live-panel {
      margin-top: 2rem;
      background: #0d0d0d;
      border: 1px solid #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    
    .live-header {
      background: #1a1a1a;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid #2a2a2a;
      font-size: 0.85rem;
    }
    
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      opacity: 0.3;
    }
    .live-dot.active {
      opacity: 1;
      box-shadow: 0 0 8px #4ade80;
      animation: pulse 2s infinite;
    }
    
    .live-state { color: #888; margin-left: auto; }
    .live-candidate { color: #fff; }
    
    .live-logs {
      padding: 1rem;
      max-height: 300px;
      overflow-y: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    
    .log-entry { margin-bottom: 0.5rem; display: flex; gap: 0.5rem; }
    .log-time { color: #666; font-size: 0.75rem; min-width: 60px; }
    .log-icon { width: 16px; text-align: center; }
    .log-msg { color: #ccc; }
    
    .log-success .log-msg { color: #4ade80; }
    .log-warning .log-msg { color: #eab308; }
    .log-error .log-msg { color: #ef4444; }
    .log-info .log-msg { color: #a1a1aa; }

    /* Candidates Table */
    .candidates-table-container { margin-top: 1rem; width: 100%; overflow-x: auto; background: #0a0a0a; border: 1px solid #1a1a1a; padding: 1rem; border-radius: 8px; }
    .candidates-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .candidates-table th, .candidates-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #1a1a1a; }
    .candidates-table th { color: #888; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05rem; }
    .candidates-table td strong { display: block; font-size: 0.9rem; color: #fff; }
    .candidates-table td small { color: #666; font-size: 0.75rem; }
    .rec-badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; }
    .rec-badge.success { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
    .rec-badge.warning { background: rgba(234, 179, 8, 0.1); color: #eab308; }
    .action-cell { display: flex; gap: 0.5rem; align-items: center; }
    .btn-sm { padding: 0.4rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold; }
    .btn-accept { background: #4ade80; color: #000; }
    .btn-reject { background: #ef4444; color: #fff; }
    .btn-accept:disabled, .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-refresh { background: transparent; border: 1px solid #333; color: #888; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-bottom: 1rem; }
    .btn-refresh:hover { background: #1a1a1a; color: #fff; }
    .btn-run.alt { background: transparent; border: 1px solid #333; color: #fff; }
    
    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid #333;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    
    .advance-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #1a1a1a;
    }
    
    .btn-advance {
      padding: 0.875rem 1.5rem;
      background: linear-gradient(135deg, #4ade80, #22c55e);
      color: #000;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .workflow-empty {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .empty-state {
      text-align: center;
      color: #444;
    }
    
    .empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    .empty-state h3 { color: #888; }
    
    .empty { color: #666; text-align: center; padding: 2rem; font-size: 0.9rem; }
    
    /* Modal Wizard Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    
    .modal.wizard {
      background: #111;
      border: 1px solid #222;
      border-radius: 12px;
      width: 520px;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .wizard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #222;
    }
    
    .wizard-header h2 { font-size: 1.1rem; }
    .step-indicator { color: #666; font-size: 0.85rem; }
    
    .wizard-step {
      padding: 1.5rem;
    }
    
    .wizard-step h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
    .wizard-step > p { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
    
    .upload-area {
      border: 2px dashed #333;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .upload-area.dragover {
      border-color: #4ade80;
      background: rgba(74, 222, 128, 0.05);
    }
    
    .upload-content { color: #888; }
    .upload-icon { font-size: 2rem; display: block; margin-bottom: 0.75rem; }
    
    .file-selected {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-align: left;
    }
    
    .file-icon { font-size: 2rem; }
    .file-selected strong { display: block; }
    .file-selected small { color: #666; }
    .btn-remove {
      margin-left: auto;
      background: #333;
      border: none;
      color: #fff;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
    }
    
    .upload-status {
      margin-top: 1rem;
      font-size: 0.85rem;
    }
    .upload-status .success { color: #4ade80; }
    .upload-status .error { color: #ef4444; }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    .form-group.full { grid-column: 1 / -1; }
    
    .form-group label {
      display: block;
      font-size: 0.8rem;
      color: #888;
      margin-bottom: 0.5rem;
    }
    
    .form-group input {
      width: 100%;
      padding: 0.75rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
    }
    
    .form-group.large { margin-bottom: 1.5rem; }
    .large-input {
      font-size: 1.1rem !important;
      padding: 1rem !important;
    }
    
    .summary-card {
      background: #0a0a0a;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.25rem;
    }
    
    .summary-card h4 { font-size: 0.85rem; margin-bottom: 0.75rem; color: #888; }
    .summary-card p { font-size: 0.9rem; margin-bottom: 0.25rem; }
    
    .wizard-actions {
      display: flex;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid #222;
      gap: 0.75rem;
    }
    
    .spacer { flex: 1; }
    
    .btn-back, .btn-cancel {
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: 1px solid #333;
      color: #888;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .btn-next, .btn-create {
      padding: 0.75rem 1.5rem;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class WorkflowsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  workflows = signal<Workflow[]>([]);
  selected = signal<Workflow | null>(null);
  isRunning = signal(false);

  showCreateWizard = false;
  wizardStep = 1;
  uploadedFile: File | null = null;
  uploadStatus: { type: string; message: string } | null = null;
  isDragover = false;

  newJob = {
    title: '',
    role: '',
    minExperience: 0,
    location: '',
    salaryRange: ''
  };
  workflowName = '';

  voiceServerUrl = '';

  private pollInterval: any;
  private interviewPollInterval: any;
  interviewLogs: any[] = [];
  interviewState = 'not_started';
  interviewCandidate: string | null = null;
  offerCandidates: any[] = [];

  ngOnInit(): void {
    this.loadWorkflows();
  }


  loadWorkflows(): void {
    this.http.get<Workflow[]>(`${this.apiUrl}/workflows`).subscribe({
      next: data => this.workflows.set(data),
      error: () => { }
    });
  }

  selectWorkflow(w: Workflow): void {
    this.selected.set(w);
    this.http.get<Workflow>(`${this.apiUrl}/workflows/${w._id}`).subscribe({
      next: data => {
        this.selected.set(data);
        const currentStep = data.steps[data.currentStep];
        if (currentStep && currentStep.agent === 'offer_letter' && currentStep.status !== 'completed') {
           this.loadOfferCandidates();
        }
      }
    });
  }

  getAgentConfig(agent: string) {
    return AGENT_CONFIG.find(a => a.key === agent) || { name: agent, icon: '◆', desc: '' };
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragover = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragover = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  handleFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      this.uploadStatus = { type: 'error', message: 'Only Excel or CSV files allowed' };
      return;
    }
    this.uploadedFile = file;
    this.uploadStatus = null;
  }

  async nextWizardStep(): Promise<void> {
    if (this.wizardStep === 1) {
      if (!this.uploadedFile) {
        this.uploadStatus = { type: 'error', message: 'Please select a file' };
        return;
      }

      const formData = new FormData();
      formData.append('file', this.uploadedFile);

      this.uploadStatus = { type: 'info', message: 'Uploading...' };

      this.http.post(`${this.apiUrl}/upload/applications`, formData).subscribe({
        next: () => {
          this.uploadStatus = { type: 'success', message: 'File uploaded!' };
          this.wizardStep = 2;
        },
        error: () => {
          this.uploadStatus = { type: 'error', message: 'Upload failed' };
        }
      });
      return;
    }

    if (this.wizardStep === 2) {
      if (!this.newJob.title || !this.newJob.role) {
        return;
      }
      this.workflowName = `${this.newJob.title} Hiring`;
    }

    this.wizardStep++;
  }

  createWorkflow(): void {
    this.http.post<Job>(`${this.apiUrl}/jobs`, {
      title: this.newJob.title,
      role: this.newJob.role,
      requirements: {
        minExperience: this.newJob.minExperience,
        location: this.newJob.location,
        salaryRange: this.newJob.salaryRange,
        skills: []
      }
    }).subscribe({
      next: (job) => {
        this.http.post<Workflow>(`${this.apiUrl}/workflows`, {
          jobId: job._id,
          name: this.workflowName
        }).subscribe({
          next: (workflow) => {
            this.showCreateWizard = false;
            this.resetWizard();
            this.loadWorkflows();
            this.selected.set(workflow);
          }
        });
      }
    });
  }

  resetWizard(): void {
    this.wizardStep = 1;
    this.uploadedFile = null;
    this.uploadStatus = null;
    this.newJob = { title: '', role: '', minExperience: 0, location: '', salaryRange: '' };
    this.workflowName = '';
  }

  runCurrentStep(): void {
    const wf = this.selected();
    if (!wf) return;

    const currentStep = wf.steps[wf.currentStep];
    let additionalData: any = {};

    if (currentStep.agent === 'voice_caller') {
      additionalData.serverUrl = this.voiceServerUrl;
    }

    this.isRunning.set(true);

    // Start interview status polling if this is the interview agent
    if (currentStep.agent === 'interview_agent') {
      this.startInterviewStatusPolling();
    }

    this.http.post(`${this.apiUrl}/workflows/${wf._id}/run-step`, additionalData).subscribe({
      next: () => {
        this.startPolling(wf._id);
      },
      error: () => this.isRunning.set(false)
    });
  }

  startPolling(workflowId: string): void {
    this.pollInterval = setInterval(() => {
      this.http.get<any>(`${this.apiUrl}/workflows/${workflowId}/step-status`).subscribe({
        next: (res) => {
          if (res.stepStatus === 'completed' || res.stepStatus === 'failed') {
            clearInterval(this.pollInterval);
            this.isRunning.set(false);
            
            // Refresh the workflow - user must manually advance to next step
            this.http.get<Workflow>(`${this.apiUrl}/workflows/${workflowId}`).subscribe({
              next: (data) => {
                this.selected.set(data);
                this.loadWorkflows();
              }
            });
          }
        }
      });
    }, 2000);
  }



  refreshWorkflow(id: string): void {
    this.http.get<Workflow>(`${this.apiUrl}/workflows/${id}`).subscribe({
      next: (data) => this.selected.set(data)
    });
    this.loadWorkflows();
  }

  startInterviewStatusPolling(): void {
    // Clear any existing interval
    if (this.interviewPollInterval) clearInterval(this.interviewPollInterval);
    
    // Poll immediately
    this.fetchInterviewStatus();
    
    // Then poll every 3 seconds
    this.interviewPollInterval = setInterval(() => {
      this.fetchInterviewStatus();
    }, 3000);
  }

  fetchInterviewStatus(): void {
    this.http.get<any>(`${this.apiUrl}/workflows/interview-agent/status`).subscribe({
      next: (data) => {
        this.interviewLogs = data.logs || [];
        this.interviewState = data.state || 'not_started';
        this.interviewCandidate = data.current_candidate || null;
        
        // Auto-scroll the log panel
        setTimeout(() => {
          const el = document.getElementById('interviewLogs');
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.interviewPollInterval) clearInterval(this.interviewPollInterval);
  }

  canAdvance(): boolean {
    const wf = this.selected();
    if (!wf) return false;
    const current = wf.steps[wf.currentStep];
    return current?.status === 'completed' && wf.currentStep < wf.steps.length - 1;
  }

  advanceToNext(): void {
    const wf = this.selected();
    if (!wf) return;

    this.http.post<Workflow>(`${this.apiUrl}/workflows/${wf._id}/advance`, {}).subscribe({
      next: (data) => {
        this.selected.set(data);
        this.loadWorkflows();
      }
    });
  }

  formatResult(result: any): string {
    if (!result) return '';
    if (result.shortlisted !== undefined) {
      return `${result.shortlisted}/${result.total_candidates} shortlisted`;
    }
    if (result.calls_initiated !== undefined) {
      return `${result.calls_initiated} calls`;
    }
    return '✓ Done';
  }

  loadOfferCandidates(): void {
    const wf = this.selected();
    if (!wf) return;
    this.http.get<any>(`${this.apiUrl}/workflows/${wf._id}/candidates`).subscribe({
      next: (res) => {
        this.offerCandidates = res.candidates || [];
      }
    });
  }

  processCandidate(candidate: any, action: 'accept' | 'reject'): void {
    const wf = this.selected();
    if (!wf) return;
    
    candidate.processing = true;
    
    this.http.post(`${this.apiUrl}/workflows/${wf._id}/run-step`, {
      action: action,
      candidateEmail: candidate.email
    }).subscribe({
      next: () => {
         // Start normal polling to wait for task completion, which will eventually refresh UI
         this.startPolling(wf._id);
      },
      error: () => {
         candidate.processing = false;
         alert('Failed to process candidate');
      }
    });
  }

  markOfferStepComplete(): void {
    const wf = this.selected();
    if (!wf) return;
    this.advanceToNext();
  }
}
