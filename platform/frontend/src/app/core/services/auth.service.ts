import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'recruiter';
}

export interface Organization {
    id: string;
    name: string;
}

export interface AuthResponse {
    user: User;
    organization: Organization;
    accessToken: string;
    refreshToken: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = environment.apiUrl;

    private userSignal = signal<User | null>(null);
    private orgSignal = signal<Organization | null>(null);

    user = this.userSignal.asReadonly();
    organization = this.orgSignal.asReadonly();
    isAuthenticated = computed(() => !!this.userSignal());

    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        this.loadStoredUser();
    }

    private loadStoredUser(): void {
        const stored = localStorage.getItem('user');
        const org = localStorage.getItem('organization');
        if (stored) {
            this.userSignal.set(JSON.parse(stored));
        }
        if (org) {
            this.orgSignal.set(JSON.parse(org));
        }
    }

    register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        organizationName: string;
    }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, data)
            .pipe(
                tap(res => this.handleAuthSuccess(res)),
                catchError(err => throwError(() => err))
            );
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, { email, password })
            .pipe(
                tap(res => this.handleAuthSuccess(res)),
                catchError(err => throwError(() => err))
            );
    }

    logout(): void {
        this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe();
        this.clearAuth();
        this.router.navigate(['/login']);
    }

    refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
        const refreshToken = localStorage.getItem('refreshToken');
        return this.http.post<{ accessToken: string; refreshToken: string }>(
            `${this.API_URL}/auth/refresh`,
            { refreshToken }
        ).pipe(
            tap(res => {
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);
            })
        );
    }

    private handleAuthSuccess(res: AuthResponse): void {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('organization', JSON.stringify(res.organization));
        this.userSignal.set(res.user);
        this.orgSignal.set(res.organization);
    }

    private clearAuth(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('organization');
        this.userSignal.set(null);
        this.orgSignal.set(null);
    }

    getToken(): string | null {
        return localStorage.getItem('accessToken');
    }
}
