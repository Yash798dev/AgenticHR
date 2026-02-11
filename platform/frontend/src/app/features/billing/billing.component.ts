import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PlanDetails {
    name: string;
    price: number;
    workflowsPerMonth: number;
    candidatesPerJob: number;
    teamMembers: number;
}

interface Subscription {
    plan: string;
    status: string;
    planDetails: PlanDetails;
}

interface Usage {
    workflows: {
        used: number;
        limit: number;
        remaining: number | string;
    };
    plan: string;
}

@Component({
    selector: 'app-billing',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="billing-page">
      <header class="page-header">
        <h1>Billing & Subscription</h1>
      </header>
      
      <div class="billing-grid">
        <!-- Current Plan -->
        <section class="card current-plan">
          <h2>Current Plan</h2>
          <div class="plan-info" *ngIf="subscription()">
            <span class="plan-name">{{ subscription()?.planDetails?.name }}</span>
            <span class="plan-price" *ngIf="subscription()?.planDetails?.price">
              ₹{{ subscription()?.planDetails?.price | number }}/mo
            </span>
            <span class="plan-price" *ngIf="!subscription()?.planDetails?.price">Free</span>
            <span class="status" [class]="subscription()?.status">{{ subscription()?.status }}</span>
          </div>
        </section>
        
        <!-- Usage -->
        <section class="card usage">
          <h2>Usage This Month</h2>
          <div class="usage-bar" *ngIf="usage()">
            <div class="usage-header">
              <span>Workflows</span>
              <span>{{ usage()?.workflows?.used }} / {{ usage()?.workflows?.limit }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="getUsagePercent()"></div>
            </div>
          </div>
        </section>
      </div>
      
      <!-- Plans -->
      <section class="plans-section">
        <h2>Available Plans</h2>
        <div class="plans-grid">
          <div class="plan-card" *ngFor="let plan of plans" [class.current]="subscription()?.plan === plan.key">
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="price" *ngIf="plan.price">₹{{ plan.price | number }}</span>
              <span class="price" *ngIf="!plan.price">Free</span>
              <span class="period" *ngIf="plan.price">/month</span>
            </div>
            <ul class="plan-features">
              <li>{{ plan.workflows === -1 ? 'Unlimited' : plan.workflows }} workflows/month</li>
              <li>{{ plan.candidates === -1 ? 'Unlimited' : plan.candidates }} candidates/job</li>
              <li>{{ plan.team === -1 ? 'Unlimited' : plan.team }} team members</li>
            </ul>
            <button 
              class="btn-upgrade"
              [class.current]="subscription()?.plan === plan.key"
              [disabled]="subscription()?.plan === plan.key"
              (click)="upgradePlan(plan.key)">
              {{ subscription()?.plan === plan.key ? 'Current Plan' : 'Upgrade' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
    styles: [`
    .billing-page {
      min-height: 100vh;
      background: #0a0a0a;
      padding: 2rem;
    }
    
    .page-header h1 { font-size: 1.5rem; margin-bottom: 2rem; }
    
    .billing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .card {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.5rem;
    }
    
    .card h2 {
      font-size: 0.9rem;
      color: #888;
      margin-bottom: 1rem;
    }
    
    .current-plan .plan-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .plan-name {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .plan-price {
      color: #888;
    }
    
    .status {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      background: #222;
    }
    
    .status.active { color: #4ade80; }
    
    .usage-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    
    .progress-bar {
      height: 8px;
      background: #222;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      transition: width 0.3s;
    }
    
    .plans-section h2 {
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }
    
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    
    .plan-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }
    
    .plan-card.current {
      border-color: #4ade80;
    }
    
    .plan-card h3 {
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
    
    .plan-card .plan-price {
      margin-bottom: 1rem;
    }
    
    .plan-card .price {
      font-size: 1.75rem;
      font-weight: 600;
    }
    
    .plan-card .period {
      color: #666;
      font-size: 0.85rem;
    }
    
    .plan-features {
      list-style: none;
      text-align: left;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      color: #888;
    }
    
    .plan-features li {
      padding: 0.4rem 0;
      border-bottom: 1px solid #1a1a1a;
    }
    
    .btn-upgrade {
      width: 100%;
      padding: 0.75rem;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .btn-upgrade:disabled {
      background: #333;
      color: #888;
      cursor: not-allowed;
    }
    
    .btn-upgrade.current {
      background: #222;
      color: #4ade80;
    }
  `]
})
export class BillingComponent implements OnInit {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    subscription = signal<Subscription | null>(null);
    usage = signal<Usage | null>(null);

    plans = [
        { key: 'free', name: 'Free', price: 0, workflows: 10, candidates: 50, team: 2 },
        { key: 'starter', name: 'Starter', price: 4999, workflows: 50, candidates: 200, team: 5 },
        { key: 'pro', name: 'Pro', price: 14999, workflows: 200, candidates: 1000, team: 15 },
        { key: 'enterprise', name: 'Enterprise', price: 49999, workflows: -1, candidates: -1, team: -1 }
    ];

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.http.get<Subscription>(`${this.apiUrl}/billing/subscription`)
            .subscribe(data => this.subscription.set(data));

        this.http.get<Usage>(`${this.apiUrl}/billing/usage`)
            .subscribe(data => this.usage.set(data));
    }

    getUsagePercent(): number {
        const u = this.usage();
        if (!u?.workflows) return 0;
        return (u.workflows.used / u.workflows.limit) * 100;
    }

    upgradePlan(plan: string): void {
        this.http.post<any>(`${this.apiUrl}/billing/upgrade`, { plan })
            .subscribe(() => this.loadData());
    }
}
