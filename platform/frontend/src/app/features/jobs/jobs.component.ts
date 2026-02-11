import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService, Job } from '../../core/services/workflow.service';

@Component({
    selector: 'app-jobs',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="jobs-page">
      <header class="page-header">
        <h1>Jobs</h1>
        <button class="btn-primary" (click)="showModal = true">+ Create Job</button>
      </header>
      
      <div class="jobs-grid">
        <div class="job-card" *ngFor="let job of jobs()">
          <div class="job-header">
            <span class="job-id">{{ job.jobId }}</span>
            <span class="status" [class]="job.status">{{ job.status }}</span>
          </div>
          <h3>{{ job.title }}</h3>
          <p class="role">{{ job.role }}</p>
          
          <div class="requirements">
            <span *ngIf="job.requirements?.location">📍 {{ job.requirements.location }}</span>
            <span *ngIf="job.requirements?.minExperience">🎯 {{ job.requirements.minExperience }}+ yrs</span>
            <span *ngIf="job.requirements?.salaryRange">💰 {{ job.requirements.salaryRange }}</span>
          </div>
          
          <div class="pipeline">
            <div class="pipeline-stat">
              <span>{{ job.pipeline?.total || 0 }}</span>
              <small>Total</small>
            </div>
            <div class="pipeline-stat">
              <span>{{ job.pipeline?.screened || 0 }}</span>
              <small>Screened</small>
            </div>
            <div class="pipeline-stat">
              <span>{{ job.pipeline?.interviewed || 0 }}</span>
              <small>Interviewed</small>
            </div>
            <div class="pipeline-stat">
              <span>{{ job.pipeline?.hired || 0 }}</span>
              <small>Hired</small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Create Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Create New Job</h2>
          
          <div class="form-group">
            <label>Job Title</label>
            <input [(ngModel)]="newJob.title" placeholder="e.g., Senior Python Developer">
          </div>
          
          <div class="form-group">
            <label>Role</label>
            <input [(ngModel)]="newJob.role" placeholder="e.g., Python Developer">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Min Experience (years)</label>
              <input type="number" [(ngModel)]="newJob.minExperience" placeholder="2">
            </div>
            <div class="form-group">
              <label>Location</label>
              <input [(ngModel)]="newJob.location" placeholder="Bangalore">
            </div>
          </div>
          
          <div class="form-group">
            <label>Salary Range</label>
            <input [(ngModel)]="newJob.salaryRange" placeholder="10-15 LPA">
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="newJob.description" rows="3" placeholder="Job description..."></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn-outline" (click)="showModal = false">Cancel</button>
            <button class="btn-primary" (click)="createJob()">Create Job</button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .jobs-page {
      min-height: 100vh;
      background: #0a0a0a;
      padding: 2rem;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    
    .page-header h1 { font-size: 1.5rem; }
    
    .btn-primary {
      padding: 0.75rem 1.25rem;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .jobs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    
    .job-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.25rem;
    }
    
    .job-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    
    .job-id {
      font-size: 0.75rem;
      color: #666;
      font-family: monospace;
    }
    
    .status {
      font-size: 0.65rem;
      text-transform: uppercase;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      background: #222;
    }
    
    .status.open { color: #4ade80; }
    .status.closed { color: #f87171; }
    .status.draft { color: #888; }
    
    .job-card h3 {
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }
    
    .role {
      color: #888;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    
    .requirements {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: #888;
    }
    
    .pipeline {
      display: flex;
      justify-content: space-between;
      padding-top: 1rem;
      border-top: 1px solid #222;
    }
    
    .pipeline-stat {
      text-align: center;
    }
    
    .pipeline-stat span {
      display: block;
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .pipeline-stat small {
      font-size: 0.65rem;
      color: #666;
    }
    
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    
    .modal {
      background: #111;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 2rem;
      width: 450px;
    }
    
    .modal h2 { margin-bottom: 1.5rem; }
    
    .form-group { margin-bottom: 1rem; }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    .form-group label {
      display: block;
      font-size: 0.85rem;
      color: #888;
      margin-bottom: 0.5rem;
    }
    
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
      resize: none;
    }
    
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    
    .btn-outline {
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: 1px solid #333;
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
    }
  `]
})
export class JobsComponent implements OnInit {
    private workflowService = inject(WorkflowService);

    jobs = this.workflowService.jobs;
    showModal = false;
    newJob = {
        title: '',
        role: '',
        minExperience: 0,
        location: '',
        salaryRange: '',
        description: ''
    };

    ngOnInit(): void {
        this.workflowService.getJobs().subscribe();
    }

    createJob(): void {
        this.workflowService.createJob({
            title: this.newJob.title,
            role: this.newJob.role,
            description: this.newJob.description,
            requirements: {
                minExperience: this.newJob.minExperience,
                location: this.newJob.location,
                salaryRange: this.newJob.salaryRange,
                skills: []
            }
        }).subscribe(() => {
            this.showModal = false;
            this.workflowService.getJobs().subscribe();
            this.newJob = { title: '', role: '', minExperience: 0, location: '', salaryRange: '', description: '' };
        });
    }
}
