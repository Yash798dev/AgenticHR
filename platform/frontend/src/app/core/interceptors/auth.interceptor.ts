import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const token = authService.getToken();

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && error.error?.code === 'TOKEN_EXPIRED') {

                return authService.refreshToken().pipe(
                    switchMap(res => {
                        req = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${res.accessToken}`
                            }
                        });
                        return next(req);
                    }),
                    catchError(refreshError => {
                        authService.logout();
                        return throwError(() => refreshError);
                    })
                );
            }

            if (error.status === 401) {
                authService.logout();
            }

            return throwError(() => error);
        })
    );
};
