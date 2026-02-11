import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>AGENTIC HR</h1>
          <p>Create your account</p>
        </div>
        
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label>First Name</label>
              <input type="text" formControlName="firstName" placeholder="John">
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" formControlName="lastName" placeholder="Doe">
            </div>
          </div>
          
          <div class="form-group">
            <label>Organization Name</label>
            <input type="text" formControlName="organizationName" placeholder="Your Company">
          </div>
          
          <div class="form-group">
            <label>Work Email</label>
            <input type="email" formControlName="email" placeholder="you@company.com">
          </div>
          
          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="Min 6 characters">
          </div>
          
          <button type="submit" [disabled]="form.invalid || loading" class="btn-primary">
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
          
          <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>
        </form>
        
        <p class="auth-footer">
          Already have an account? <a routerLink="/login">Sign in</a>
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
      max-width: 450px;
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
    
    .auth-header p { color: #888; }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    .form-group { margin-bottom: 1.25rem; }
    
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
    }
    
    input:focus { border-color: #fff; }
    input::placeholder { color: #555; }
    
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
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .error-message {
      color: #f87171;
      text-align: center;
      margin-top: 1rem;
    }
    
    .auth-footer {
      text-align: center;
      color: #666;
      margin-top: 1.5rem;
    }
    
    .auth-footer a { color: #fff; text-decoration: none; }
  `]
})
export class RegisterComponent {
    form: FormGroup;
    loading = false;
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.form = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            organizationName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.loading = true;
        this.errorMessage = '';

        this.authService.register(this.form.value).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.message || 'Registration failed';
            }
        });
    }
}
