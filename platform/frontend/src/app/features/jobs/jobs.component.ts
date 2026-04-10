import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WorkflowService, Job } from '../../core/services/workflow.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
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
        <header class="toolbar">
          <div>
            <h1>Jobs</h1>
            <p>Create and manage job openings</p>
          </div>
          <button class="primary" (click)="openCreate()" [disabled]="isSubmitting || isRefreshing">
            <span class="btn-content">Create Job</span>
          </button>
        </header>

        <section class="filters">
          <input [(ngModel)]="query" placeholder="Search by title, role, or job ID" />
          <select [(ngModel)]="statusFilter">
            <option value="all">All statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
          </select>
          <button class="ghost" (click)="refresh()" [disabled]="isRefreshing">
            <span class="btn-content">
              <span *ngIf="isRefreshing" class="btn-spinner light"></span>
              {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
            </span>
          </button>
        </section>

        <section class="table-wrap" *ngIf="filteredJobs().length; else emptyState">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Role</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let job of filteredJobs()">
                <td>
                  <strong>{{ job.title }}</strong>
                  <small>{{ job.jobId }}</small>
                </td>
                <td>{{ job.role }}</td>
                <td>{{ job.requirements.location || '-' }}</td>
                <td>{{ job.requirements.minExperience || 0 }} yrs</td>
                <td>{{ job.requirements.salaryRange || '-' }}</td>
                <td>
                  <select class="status-select" [ngModel]="job.status" (ngModelChange)="changeStatus(job, $event)" [disabled]="statusUpdatingJobId === job._id">
                    <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
                  </select>
                </td>
                <td class="actions">
                  <button (click)="openEdit(job)" [disabled]="deletingJobId === job._id || isSubmitting">Edit</button>
                  <button (click)="deleteJob(job)" [disabled]="deletingJobId === job._id || isSubmitting">
                    <span class="btn-content">
                      <span *ngIf="deletingJobId === job._id" class="btn-spinner light"></span>
                      {{ deletingJobId === job._id ? 'Deleting...' : 'Delete' }}
                    </span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <ng-template #emptyState>
          <div class="empty">No jobs found for current filters.</div>
        </ng-template>
      </main>

      <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ editingId ? 'Edit Job' : 'Create Job' }}</h2>
          <div class="grid">
            <label>Title<input [(ngModel)]="form.title" /></label>
            <label>Role<input [(ngModel)]="form.role" /></label>
            <label>Location<input [(ngModel)]="form.location" /></label>
            <label>Min Experience<input type="number" [(ngModel)]="form.minExperience" /></label>
            <label class="full">Salary Range<input [(ngModel)]="form.salaryRange" /></label>
            <label class="full">Description<textarea rows="4" [(ngModel)]="form.description"></textarea></label>
          </div>
          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
          <div class="modal-actions">
            <button class="ghost" (click)="closeModal()" [disabled]="isSubmitting">Cancel</button>
            <button class="primary" (click)="submit()" [disabled]="isSubmitting">
              <span class="btn-content">
                <span *ngIf="isSubmitting" class="btn-spinner"></span>
                {{
                  isSubmitting
                    ? (editingId ? 'Saving...' : 'Creating...')
                    : (editingId ? 'Save Changes' : 'Create')
                }}
              </span>
            </button>
          </div>
        </div>
      </div>
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
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .toolbar h1 { margin: 0; }
    .toolbar p { margin: 4px 0 0; color: #9b9b9b; }

    .filters { display: grid; grid-template-columns: 1fr 180px auto; gap: 8px; margin-bottom: 12px; }
    input, select, textarea { background: #121212; color: #fff; border: 1px solid #343434; border-radius: 8px; padding: 10px; }
    .primary { background: #fff; color: #000; border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
    .ghost { background: transparent; color: #d2d2d2; border: 1px solid #3b3b3b; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
    .primary:hover:not(:disabled), .ghost:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(255,255,255,.08); }

    .table-wrap { background: #111; border: 1px solid #242424; border-radius: 10px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 920px; }
    th, td { padding: 12px; border-bottom: 1px solid #1f1f1f; font-size: 14px; text-align: left; }
    tbody tr { transition: background-color .2s ease; }
    tbody tr:hover { background: #151515; }
    th { color: #a7a7a7; font-weight: 500; }
    td strong { display: block; }
    td small { color: #8f8f8f; }
    .status-select { width: 120px; padding: 6px 8px; }
    .actions { display: flex; gap: 6px; }
    .actions button { background: #1a1a1a; border: 1px solid #3a3a3a; color: #fff; border-radius: 6px; padding: 6px 10px; cursor: pointer; }

    .empty { background: #111; border: 1px solid #242424; border-radius: 10px; padding: 30px; color: #a0a0a0; text-align: center; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: grid; place-items: center; }
    .modal { width: min(720px, 92vw); background: #101010; border: 1px solid #2b2b2b; border-radius: 12px; padding: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    label { font-size: 12px; color: #b2b2b2; display: grid; gap: 6px; }
    .full { grid-column: 1 / -1; }
    .modal-actions { margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px; }
    .error { color: #d8d8d8; background: #1a1a1a; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px; }

    @media (max-width: 1000px) {
      .page { grid-template-columns: 1fr; }
      .sidebar { position: sticky; top: 0; z-index: 2; border-right: 0; border-bottom: 1px solid #242424; }
      .nav { grid-template-columns: repeat(5, minmax(0,1fr)); }
      .nav a { text-align: center; font-size: 12px; }
      .filters { grid-template-columns: 1fr; }
      .grid { grid-template-columns: 1fr; }
    }
  `]
})
export class JobsComponent implements OnInit {
  private workflowService = inject(WorkflowService);

  jobs: Job[] = [];
  query = '';
  statusFilter: Job['status'] | 'all' = 'all';
  statuses: Job['status'][] = ['draft', 'open', 'paused', 'closed', 'filled'];

  showModal = false;
  editingId: string | null = null;
  errorMessage = '';
  isRefreshing = false;
  isSubmitting = false;
  deletingJobId: string | null = null;
  statusUpdatingJobId: string | null = null;

  form = {
    title: '',
    role: '',
    location: '',
    minExperience: 0,
    salaryRange: '',
    description: ''
  };

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.isRefreshing = true;
    this.workflowService.getJobs().subscribe({
      next: data => this.jobs = data,
      error: () => {
        this.jobs = [];
        this.isRefreshing = false;
      },
      complete: () => this.isRefreshing = false
    });
  }

  filteredJobs(): Job[] {
    const q = this.query.trim().toLowerCase();
    return this.jobs.filter(job => {
      const matchesQuery = !q ||
        job.title.toLowerCase().includes(q) ||
        job.role.toLowerCase().includes(q) ||
        job.jobId.toLowerCase().includes(q);
      const matchesStatus = this.statusFilter === 'all' || job.status === this.statusFilter;
      return matchesQuery && matchesStatus;
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.errorMessage = '';
    this.form = { title: '', role: '', location: '', minExperience: 0, salaryRange: '', description: '' };
    this.showModal = true;
  }

  openEdit(job: Job): void {
    this.editingId = job._id;
    this.errorMessage = '';
    this.form = {
      title: job.title,
      role: job.role,
      location: job.requirements?.location || '',
      minExperience: job.requirements?.minExperience || 0,
      salaryRange: job.requirements?.salaryRange || '',
      description: job.description || ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    if (this.isSubmitting) return;
    this.showModal = false;
  }

  submit(): void {
    if (this.isSubmitting) return;
    this.errorMessage = '';
    if (!this.form.title.trim() || !this.form.role.trim()) {
      this.errorMessage = 'Title and role are required.';
      return;
    }

    const payload = {
      title: this.form.title.trim(),
      role: this.form.role.trim(),
      description: this.form.description.trim(),
      requirements: {
        minExperience: Number(this.form.minExperience) || 0,
        location: this.form.location.trim(),
        salaryRange: this.form.salaryRange.trim(),
        skills: []
      }
    };

    const request$ = this.editingId
      ? this.workflowService.updateJob(this.editingId, payload)
      : this.workflowService.createJob(payload);

    this.isSubmitting = true;
    request$.subscribe({
      next: () => {
        this.showModal = false;
        this.refresh();
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Operation failed.';
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  changeStatus(job: Job, status: Job['status']): void {
    if (job.status === status) return;
    this.statusUpdatingJobId = job._id;
    this.workflowService.updateJobStatus(job._id, status).subscribe({
      next: updated => {
        const index = this.jobs.findIndex(j => j._id === updated._id);
        if (index !== -1) this.jobs[index] = updated;
      },
      error: () => {
        this.refresh();
        this.statusUpdatingJobId = null;
      },
      complete: () => this.statusUpdatingJobId = null
    });
  }

  deleteJob(job: Job): void {
    const ok = confirm(`Delete job ${job.title} (${job.jobId})?`);
    if (!ok) return;
    this.deletingJobId = job._id;
    this.workflowService.deleteJob(job._id).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.refresh();
        this.deletingJobId = null;
      },
      complete: () => this.deletingJobId = null
    });
  }
}

