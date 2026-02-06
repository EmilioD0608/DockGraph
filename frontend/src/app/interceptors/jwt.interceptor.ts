import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getToken();

    let authReq = req;
    if (token) {
        authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            // Si es 401 y no es una petición de login o refresh
            if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
                return authService.refreshToken().pipe(
                    switchMap((res: any) => {
                        // Token refrescado exitosamente, reintentar petición original con el nuevo token
                        const newToken = res.access_token;
                        const newReq = req.clone({
                            headers: req.headers.set('Authorization', `Bearer ${newToken}`)
                        });
                        return next(newReq);
                    }),
                    catchError((refreshErr) => {
                        // Si falla el refresh (token expirado o inválido), logout y redirigir
                        authService.logout();
                        return throwError(() => refreshErr);
                    })
                );
            }
            return throwError(() => error);
        })
    );
};
