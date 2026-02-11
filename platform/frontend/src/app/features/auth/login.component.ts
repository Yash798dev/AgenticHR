import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>AGENTIC HR</h1>
          <p>Welcome back</p>
        </div>
        
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="you@company.com">
            <span class="error" *ngIf="form.get('email')?.touched && form.get('email')?.invalid">
              Valid email required
            </span>
          </div>
          
          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="••••••••">
            <span class="error" *ngIf="form.get('password')?.touched && form.get('password')?.invalid">
              Password required
            </span>
          </div>
          
          <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
          
          <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>
        </form>
        
        <p class="auth-footer">
          Don't have an account? <a routerLink="/register">Create one</a>
        </p>
      </div>
    </div>
  `,
    styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0a;
      padding: 2rem;
    }
    
    .auth-card {
      width: 100%;
      max-width: 400px;
      background: #111;
      border: 1px solid #222;
      border-radius: 12px;
      padding: 2.5rem;
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .auth-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }
    
    .auth-header p {
      color: #888;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    label {
      display: block;
      font-size: 0.85rem;
      color: #aaa;
      margin-bottom: 0.5rem;
    }
    
    input {
      width: 100%;
      padding: 0.875rem 1rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    
    input:focus {
      border-color: #fff;
    }
    
    input::placeholder {
      color: #555;
    }
    
    .error {
      font-size: 0.75rem;
      color: #f87171;
      margin-top: 0.25rem;
      display: block;
    }
    
    .btn-primary {
      width: 100%;
      padding: 0.875rem;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1rem;
      transition: opacity 0.2s;
    }
    
    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .error-message {
      color: #f87171;
      text-align: center;
      margin-top: 1rem;
      font-size: 0.875rem;
    }
    
    .auth-footer {
      text-align: center;
      color: #666;
      margin-top: 1.5rem;
      font-size: 0.9rem;
    }
    
    .auth-footer a {
      color: #fff;
      text-decoration: none;
    }
  `]
})
export class LoginComponent {
    form: FormGroup;
    loading = false;
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.loading = true;
        this.errorMessage = '';

        const { email, password } = this.form.value;

        this.authService.login(email, password).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.message || 'Login failed';
            }
        });
    }
}
