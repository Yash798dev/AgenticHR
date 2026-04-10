import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';

interface PlanDetails {
  name: string;
  price: number;
  workflowsPerMonth: number;
  candidatesPerJob: number;
  teamMembers: number;
}

interface SubscriptionResponse {
  plan: string;
  status: string;
  planDetails: PlanDetails;
}

interface UsageResponse {
  workflows: {
    used: number;
    limit: number;
    remaining: number | string;
  };
}

@Component({
  selector: 'app-billing',
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
        <header class="toolbar">
          <div>
            <h1>Billing</h1>
            <p>Manage subscription plans and usage</p>
          </div>
          <button class="ghost" (click)="reload()" [disabled]="loadingPage">
            <span class="btn-content">
              <span *ngIf="loadingPage" class="btn-spinner light"></span>
              {{ loadingPage ? 'Refreshing...' : 'Refresh' }}
            </span>
          </button>
        </header>

        <section class="summary">
          <article class="card">
            <h3>Current Plan</h3>
            <p class="big">{{ subscription?.planDetails?.name || '-' }}</p>
            <small>Status: {{ subscription?.status || '-' }}</small>
          </article>
          <article class="card">
            <h3>Monthly Cost</h3>
            <p class="big">{{ subscription?.planDetails?.price ? ('INR ' + subscription?.planDetails?.price) : 'Free' }}</p>
            <small>per month</small>
          </article>
          <article class="card">
            <h3>Workflow Usage</h3>
            <p class="big">{{ usage?.workflows?.used ?? 0 }} / {{ usage?.workflows?.limit ?? 0 }}</p>
            <div class="bar"><span [style.width.%]="usagePercent()"></span></div>
          </article>
        </section>

        <section class="plans">
          <article class="plan" *ngFor="let plan of plans" [class.current]="subscription?.plan === plan.key">
            <h4>{{ plan.name }}</h4>
            <p class="price">{{ plan.price ? ('INR ' + plan.price + ' / month') : 'Free' }}</p>
            <ul>
              <li>{{ plan.workflows === -1 ? 'Unlimited' : plan.workflows }} workflows / month</li>
              <li>{{ plan.candidates === -1 ? 'Unlimited' : plan.candidates }} candidates / job</li>
              <li>{{ plan.team === -1 ? 'Unlimited' : plan.team }} team members</li>
            </ul>
            <button class="primary" [disabled]="subscription?.plan === plan.key || updatingPlanKey === plan.key || loadingPage" (click)="upgrade(plan.key)">
              <span class="btn-content">
                <span *ngIf="updatingPlanKey === plan.key" class="btn-spinner"></span>
                {{
                  updatingPlanKey === plan.key
                    ? 'Switching...'
                    : (subscription?.plan === plan.key ? 'Current Plan' : 'Switch Plan')
                }}
              </span>
            </button>
          </article>
        </section>

        <section class="danger">
          <h3>Cancel Subscription</h3>
          <p>This marks the subscription as canceled at the end of the billing period.</p>
          <button class="ghost" (click)="cancel()" [disabled]="canceling || loadingPage">
            <span class="btn-content">
              <span *ngIf="canceling" class="btn-spinner light"></span>
              {{ canceling ? 'Canceling...' : 'Cancel Plan' }}
            </span>
          </button>
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
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .toolbar h1 { margin: 0; }
    .toolbar p { margin: 4px 0 0; color: #9b9b9b; }

    .summary { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; margin-bottom: 12px; }
    .card { background: #111; border: 1px solid #252525; border-radius: 10px; padding: 14px; }
    .card h3 { margin: 0 0 6px; font-size: 14px; color: #aaa; }
    .big { margin: 0; font-size: 24px; font-weight: 600; }
    .card small { color: #9c9c9c; }
    .bar { margin-top: 8px; background: #1d1d1d; border-radius: 999px; height: 8px; border: 1px solid #2a2a2a; }
    .bar span { display: block; height: 100%; border-radius: 999px; background: #fff; }

    .plans { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
    .plan { background: #111; border: 1px solid #252525; border-radius: 10px; padding: 14px; display: grid; gap: 8px; }
    .plan.current { border-color: #5a5a5a; }
    .plan h4 { margin: 0; font-size: 16px; }
    .price { color: #cdcdcd; margin: 0; }
    ul { margin: 0; padding-left: 16px; color: #a4a4a4; font-size: 13px; display: grid; gap: 5px; }

    .danger { margin-top: 12px; background: #111; border: 1px solid #252525; border-radius: 10px; padding: 14px; }
    .danger h3 { margin: 0 0 6px; }
    .danger p { margin: 0 0 10px; color: #a2a2a2; }

    .primary { background: #fff; color: #000; border: 0; border-radius: 8px; padding: 9px 12px; font-weight: 600; cursor: pointer; }
    .primary:disabled { opacity: .45; cursor: not-allowed; }
    .ghost { background: transparent; color: #d2d2d2; border: 1px solid #3b3b3b; border-radius: 8px; padding: 9px 12px; cursor: pointer; }
    .primary:hover:not(:disabled), .ghost:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(255,255,255,.08); }

    @media (max-width: 1100px) {
      .page { grid-template-columns: 1fr; }
      .sidebar { position: sticky; top: 0; z-index: 2; border-right: 0; border-bottom: 1px solid #242424; }
      .nav { grid-template-columns: repeat(5, minmax(0,1fr)); }
      .nav a { text-align: center; font-size: 12px; }
      .summary { grid-template-columns: 1fr; }
      .plans { grid-template-columns: 1fr; }
    }
  `]
})
export class BillingComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  subscription: SubscriptionResponse | null = null;
  usage: UsageResponse | null = null;
  loadingPage = false;
  updatingPlanKey: string | null = null;
  canceling = false;

  plans = [
    { key: 'free', name: 'Free', price: 0, workflows: 10, candidates: 50, team: 2 },
    { key: 'starter', name: 'Starter', price: 4999, workflows: 50, candidates: 200, team: 5 },
    { key: 'pro', name: 'Pro', price: 14999, workflows: 200, candidates: 1000, team: 15 },
    { key: 'enterprise', name: 'Enterprise', price: 49999, workflows: -1, candidates: -1, team: -1 }
  ];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadingPage = true;
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.loadingPage = false;
    };

    this.http.get<SubscriptionResponse>(`${this.apiUrl}/billing/subscription`).subscribe({
      next: data => this.subscription = data,
      error: () => this.subscription = null,
      complete: done
    });

    this.http.get<UsageResponse>(`${this.apiUrl}/billing/usage`).subscribe({
      next: data => this.usage = data,
      error: () => this.usage = null,
      complete: done
    });
  }

  usagePercent(): number {
    const used = this.usage?.workflows?.used ?? 0;
    const limit = this.usage?.workflows?.limit ?? 0;
    if (!limit || limit < 0) return 0;
    return Math.min(100, (used / limit) * 100);
  }

  upgrade(plan: string): void {
    this.updatingPlanKey = plan;
    this.http.post(`${this.apiUrl}/billing/upgrade`, { plan }).subscribe({
      next: () => this.reload(),
      error: () => this.updatingPlanKey = null,
      complete: () => this.updatingPlanKey = null
    });
  }

  cancel(): void {
    const ok = confirm('Cancel current subscription?');
    if (!ok) return;
    this.canceling = true;
    this.http.post(`${this.apiUrl}/billing/cancel`, {}).subscribe({
      next: () => this.reload(),
      error: () => this.canceling = false,
      complete: () => this.canceling = false
    });
  }
}

