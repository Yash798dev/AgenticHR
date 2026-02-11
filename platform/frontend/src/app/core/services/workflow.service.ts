import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkflowStep {
    agent: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    taskId?: string;
    startedAt?: Date;
    completedAt?: Date;
    result?: any;
    error?: string;
}

export interface Workflow {
    _id: string;
    name: string;
    status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
    currentStep: number;
    steps: WorkflowStep[];
    job: {
        _id: string;
        jobId: string;
        title: string;
        role: string;
    };
    stats: {
        totalCandidates: number;
        shortlisted: number;
        interviewed: number;
        offered: number;
    };
    createdAt: Date;
}

export interface Job {
    _id: string;
    jobId: string;
    title: string;
    department: string;
    role: string;
    description: string;
    requirements: {
        minExperience: number;
        location: string;
        salaryRange: string;
        skills: string[];
    };
    status: 'draft' | 'open' | 'paused' | 'closed' | 'filled';
    pipeline: {
        total: number;
        screened: number;
        contacted: number;
        scheduled: number;
        interviewed: number;
        offered: number;
        hired: number;
    };
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class WorkflowService {
    private readonly API_URL = environment.apiUrl;

    workflows = signal<Workflow[]>([]);
    currentWorkflow = signal<Workflow | null>(null);
    jobs = signal<Job[]>([]);

    constructor(private http: HttpClient) { }

    getWorkflows(): Observable<Workflow[]> {
        return this.http.get<Workflow[]>(`${this.API_URL}/workflows`)
            .pipe(tap(data => this.workflows.set(data)));
    }

    getWorkflow(id: string): Observable<Workflow> {
        return this.http.get<Workflow>(`${this.API_URL}/workflows/${id}`)
            .pipe(tap(data => this.currentWorkflow.set(data)));
    }

    createWorkflow(jobId: string, name: string): Observable<Workflow> {
        return this.http.post<Workflow>(`${this.API_URL}/workflows`, { jobId, name });
    }

    runStep(workflowId: string, additionalData?: any): Observable<any> {
        return this.http.post(`${this.API_URL}/workflows/${workflowId}/run-step`, additionalData || {});
    }

    checkStepStatus(workflowId: string): Observable<any> {
        return this.http.get(`${this.API_URL}/workflows/${workflowId}/step-status`);
    }

    advanceStep(workflowId: string): Observable<Workflow> {
        return this.http.post<Workflow>(`${this.API_URL}/workflows/${workflowId}/advance`, {});
    }

    deleteWorkflow(id: string): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/workflows/${id}`);
    }

    getJobs(): Observable<Job[]> {
        return this.http.get<Job[]>(`${this.API_URL}/jobs`)
            .pipe(tap(data => this.jobs.set(data)));
    }

    getJob(id: string): Observable<Job> {
        return this.http.get<Job>(`${this.API_URL}/jobs/${id}`);
    }

    createJob(job: Partial<Job>): Observable<Job> {
        return this.http.post<Job>(`${this.API_URL}/jobs`, job);
    }

    updateJob(id: string, job: Partial<Job>): Observable<Job> {
        return this.http.put<Job>(`${this.API_URL}/jobs/${id}`, job);
    }

    deleteJob(id: string): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/jobs/${id}`);
    }
}
