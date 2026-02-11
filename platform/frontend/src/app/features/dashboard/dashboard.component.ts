import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WorkflowService, Workflow, Job } from '../../core/services/workflow.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="dashboard">
      <header class="dash-header">
        <div class="header-left">
          <h1>Dashboard</h1>
          <span class="org-name">{{ authService.organization()?.name }}</span>
        </div>
        <div class="header-right">
          <span class="user-info">{{ authService.user()?.firstName }}</span>
          <button class="btn-outline" (click)="authService.logout()">Logout</button>
        </div>
      </header>
      
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">◆</span>
          <div class="stat-content">
            <h3>{{ workflows.length }}</h3>
            <p>Active Workflows</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">◇</span>
          <div class="stat-content">
            <h3>{{ jobs.length }}</h3>
            <p>Open Jobs</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">○</span>
          <div class="stat-content">
            <h3>{{ getTotalCandidates() }}</h3>
            <p>Candidates</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">△</span>
          <div class="stat-content">
            <h3>{{ getTotalOffered() }}</h3>
            <p>Offers Sent</p>
          </div>
        </div>
      </div>
      
      <div class="dashboard-grid">
        <section class="card">
          <div class="card-header">
            <h2>Recent Workflows</h2>
            <a routerLink="/workflows" class="link">View all →</a>
          </div>
          <div class="workflow-list" *ngIf="workflows.length; else noWorkflows">
            <div class="workflow-item" *ngFor="let w of workflows.slice(0, 5)">
              <div class="workflow-info">
                <strong>{{ w.name }}</strong>
                <span>{{ w.job?.title }}</span>
              </div>
              <div class="workflow-progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getProgress(w)"></div>
                </div>
                <span class="status" [class]="w.status">{{ w.status }}</span>
              </div>
            </div>
          </div>
          <ng-template #noWorkflows>
            <p class="empty">No workflows yet. <a routerLink="/workflows">Create one</a></p>
          </ng-template>
        </section>
        
        <section class="card">
          <div class="card-header">
            <h2>Open Jobs</h2>
            <a routerLink="/jobs" class="link">View all →</a>
          </div>
          <div class="job-list" *ngIf="jobs.length; else noJobs">
            <div class="job-item" *ngFor="let j of jobs.slice(0, 5)">
              <div class="job-info">
                <strong>{{ j.title }}</strong>
                <span>{{ j.jobId }}</span>
              </div>
              <div class="job-pipeline">
                <span>{{ j.pipeline?.screened || 0 }} screened</span>
              </div>
            </div>
          </div>
          <ng-template #noJobs>
            <p class="empty">No open jobs. <a routerLink="/jobs">Create one</a></p>
          </ng-template>
        </section>
      </div>
      
      <nav class="side-nav">
        <a routerLink="/dashboard" class="nav-item active">
          <span class="nav-icon">◎</span>
          <span>Dashboard</span>
        </a>
        <a routerLink="/workflows" class="nav-item">
          <span class="nav-icon">◆</span>
          <span>Workflows</span>
        </a>
        <a routerLink="/jobs" class="nav-item">
          <span class="nav-icon">◇</span>
          <span>Jobs</span>
        </a>
        <a routerLink="/billing" class="nav-item">
          <span class="nav-icon">□</span>
          <span>Billing</span>
        </a>
      </nav>
    </div>
  `,
    styles: [`
    .dashboard {
      min-height: 100vh;
      background: #0a0a0a;
      padding-left: 220px;
    }
    
    .side-nav {
      position: fixed;
      left: 0;
      top: 0;
      width: 200px;
      height: 100vh;
      background: #111;
      border-right: 1px solid #222;
      padding: 2rem 1rem;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: #888;
      text-decoration: none;
      border-radius: 6px;
      margin-bottom: 0.25rem;
      transition: all 0.2s;
    }
    
    .nav-item:hover, .nav-item.active {
      background: #1a1a1a;
      color: #fff;
    }
    
    .nav-icon { font-size: 1.1rem; }
    
    .dash-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #222;
    }
    
    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .org-name {
      color: #666;
      font-size: 0.85rem;
      margin-left: 1rem;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .user-info { color: #888; }
    
    .btn-outline {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid #333;
      color: #888;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-outline:hover {
      border-color: #fff;
      color: #fff;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      padding: 2rem;
    }
    
    .stat-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .stat-icon {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      border-radius: 50%;
    }
    
    .stat-content h3 {
      font-size: 1.75rem;
      font-weight: 600;
    }
    
    .stat-content p {
      color: #666;
      font-size: 0.85rem;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 0 2rem 2rem;
    }
    
    .card {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.5rem;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .card-header h2 {
      font-size: 1rem;
      font-weight: 600;
    }
    
    .link {
      color: #888;
      text-decoration: none;
      font-size: 0.85rem;
    }
    
    .link:hover { color: #fff; }
    
    .workflow-item, .job-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #1a1a1a;
    }
    
    .workflow-info strong, .job-info strong {
      display: block;
      font-size: 0.9rem;
    }
    
    .workflow-info span, .job-info span {
      color: #666;
      font-size: 0.8rem;
    }
    
    .workflow-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .progress-bar {
      width: 80px;
      height: 4px;
      background: #222;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: #fff;
    }
    
    .status {
      font-size: 0.7rem;
      text-transform: uppercase;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: #222;
    }
    
    .status.active { color: #4ade80; }
    .status.completed { color: #60a5fa; }
    .status.failed { color: #f87171; }
    
    .empty {
      color: #666;
      text-align: center;
      padding: 2rem;
    }
    
    .empty a { color: #fff; }
  `]
})
export class DashboardComponent implements OnInit {
    authService = inject(AuthService);
    private workflowService = inject(WorkflowService);

    workflows: Workflow[] = [];
    jobs: Job[] = [];

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.workflowService.getWorkflows().subscribe(data => this.workflows = data);
        this.workflowService.getJobs().subscribe(data => this.jobs = data);
    }

    getProgress(w: Workflow): number {
        if (!w.steps?.length) return 0;
        const completed = w.steps.filter(s => s.status === 'completed').length;
        return (completed / w.steps.length) * 100;
    }

    getTotalCandidates(): number {
        return this.workflows.reduce((sum, w) => sum + (w.stats?.totalCandidates || 0), 0);
    }

    getTotalOffered(): number {
        return this.workflows.reduce((sum, w) => sum + (w.stats?.offered || 0), 0);
    }
}
