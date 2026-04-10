import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WorkflowService, Workflow, Job } from '../../core/services/workflow.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="page">
      <aside class="sidebar">
        <div class="brand">AGENTIC HR</div>
        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/workflows" routerLinkActive="active">Workflows</a>
          <a routerLink="/jobs" routerLinkActive="active">Jobs</a>
          <a routerLink="/files" routerLinkActive="active">Files</a>
          <a routerLink="/billing" routerLinkActive="active">Billing</a>
        </nav>
      </aside>

      <main class="content">
        <header class="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>{{ authService.organization()?.name }}</p>
          </div>
          <div class="top-actions">
            <span>{{ authService.user()?.firstName }} {{ authService.user()?.lastName }}</span>
            <button (click)="authService.logout()">Logout</button>
          </div>
        </header>

        <section class="stats-grid">
          <article class="card">
            <h3>{{ workflows.length }}</h3>
            <p>Total Workflows</p>
          </article>
          <article class="card">
            <h3>{{ getActiveWorkflows() }}</h3>
            <p>Active Workflows</p>
          </article>
          <article class="card">
            <h3>{{ jobs.length }}</h3>
            <p>Total Jobs</p>
          </article>
          <article class="card">
            <h3>{{ uploadedFiles }}</h3>
            <p>Data Files</p>
          </article>
        </section>

        <section class="panels">
          <article class="panel">
            <div class="panel-head">
              <h2>Recent Workflows</h2>
              <a routerLink="/workflows">Open</a>
            </div>
            <div *ngIf="workflows.length; else noWorkflows">
              <div class="row" *ngFor="let workflow of workflows.slice(0, 6)">
                <div>
                  <strong>{{ workflow.name }}</strong>
                  <small>{{ workflow.job.title }}</small>
                </div>
                <span class="pill" [class]="workflow.status">{{ workflow.status }}</span>
              </div>
            </div>
            <ng-template #noWorkflows>
              <p class="muted">No workflows yet.</p>
            </ng-template>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2>Recent Jobs</h2>
              <a routerLink="/jobs">Open</a>
            </div>
            <div *ngIf="jobs.length; else noJobs">
              <div class="row" *ngFor="let job of jobs.slice(0, 6)">
                <div>
                  <strong>{{ job.title }}</strong>
                  <small>{{ job.jobId }} - {{ job.role }}</small>
                </div>
                <span class="pill" [class]="job.status">{{ job.status }}</span>
              </div>
            </div>
            <ng-template #noJobs>
              <p class="muted">No jobs yet.</p>
            </ng-template>
          </article>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #0a0a0a; color: #fff; display: grid; grid-template-columns: 220px 1fr; }
    .sidebar { border-right: 1px solid #242424; padding: 20px 14px; background: #0d0d0d; }
    .brand { font-size: 14px; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 20px; }
    .nav { display: grid; gap: 6px; }
    .nav a { color: #bcbcbc; text-decoration: none; padding: 10px 12px; border-radius: 6px; border: 1px solid transparent; }
    .nav a.active, .nav a:hover { color: #fff; background: #151515; border-color: #2f2f2f; }

    .content { padding: 24px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .topbar h1 { font-size: 24px; margin: 0; }
    .topbar p { color: #9b9b9b; margin: 4px 0 0; }
    .top-actions { display: flex; gap: 10px; align-items: center; color: #bdbdbd; }
    .top-actions button { background: #fff; color: #000; border: 0; border-radius: 6px; padding: 8px 12px; font-weight: 600; cursor: pointer; }
    .top-actions button:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(255,255,255,.08); }

    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 18px; }
    .card { background: #111; border: 1px solid #252525; border-radius: 10px; padding: 16px; }
    .card { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
    .card:hover { transform: translateY(-1px); border-color: #3a3a3a; box-shadow: 0 8px 24px rgba(0,0,0,.35); }
    .card h3 { margin: 0; font-size: 28px; }
    .card p { margin: 4px 0 0; color: #a1a1a1; }

    .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .panel { background: #111; border: 1px solid #252525; border-radius: 10px; padding: 14px; }
    .panel { transition: border-color .2s ease, box-shadow .2s ease; }
    .panel:hover { border-color: #363636; box-shadow: 0 8px 24px rgba(0,0,0,.35); }
    .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .panel-head h2 { font-size: 16px; margin: 0; }
    .panel-head a { color: #fff; text-decoration: none; border-bottom: 1px solid #616161; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1f1f1f; }
    .row { transition: background-color .2s ease; }
    .row:hover { background: #151515; }
    .row:last-child { border-bottom: 0; }
    .row strong { display: block; font-size: 14px; }
    .row small { color: #9f9f9f; }
    .pill { border: 1px solid #444; border-radius: 999px; padding: 3px 10px; font-size: 11px; text-transform: uppercase; color: #cfcfcf; }
    .pill.active { border-color: #d0d0d0; color: #fff; }
    .pill.completed { border-color: #8b8b8b; color: #f5f5f5; }
    .pill.failed { border-color: #6b6b6b; color: #d4d4d4; }
    .pill.open { border-color: #d0d0d0; color: #fff; }
    .muted { color: #969696; }

    @media (max-width: 1000px) {
      .page { grid-template-columns: 1fr; }
      .sidebar { position: sticky; top: 0; z-index: 2; border-right: 0; border-bottom: 1px solid #242424; }
      .nav { grid-template-columns: repeat(5, minmax(0,1fr)); }
      .nav a { text-align: center; font-size: 12px; }
      .stats-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .panels { grid-template-columns: 1fr; }
      .topbar { flex-direction: column; align-items: flex-start; gap: 10px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private workflowService = inject(WorkflowService);

  workflows: Workflow[] = [];
  jobs: Job[] = [];
  uploadedFiles = 0;

  ngOnInit(): void {
    this.workflowService.getWorkflows().subscribe(data => this.workflows = data);
    this.workflowService.getJobs().subscribe(data => this.jobs = data);
    this.workflowService.listUploadedFiles().subscribe({
      next: res => this.uploadedFiles = res.files.length,
      error: () => this.uploadedFiles = 0
    });
  }

  getActiveWorkflows(): number {
    return this.workflows.filter(w => w.status === 'active').length;
  }
}

