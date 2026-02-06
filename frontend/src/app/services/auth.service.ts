import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private httpBackend = inject(HttpBackend); // Para bypass de interceptors
    private httpClientForRefresh = new HttpClient(this.httpBackend);

    private router = inject(Router);
    private apiUrl = 'http://localhost:3000/auth';

    currentUser = signal<{ id: number, email: string } | null>(this.getUserFromStorage());

    constructor() { }

    login(email: string, password: string) {
        return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
            tap(res => {
                if (res.access_token) {
                    this.saveSession(res);
                }
            })
        );
    }

    register(email: string, password: string) {
        return this.http.post<any>(`${this.apiUrl}/register`, { email, password }).pipe(
            tap(res => {
                if (res.access_token) {
                    this.saveSession(res);
                }
            })
        );
    }

    private saveSession(res: any) {
        localStorage.setItem('access_token', res.access_token);
        if (res.refresh_token) {
            localStorage.setItem('refresh_token', res.refresh_token);
        }
        this.currentUser.set(res.user);
        localStorage.setItem('user_data', JSON.stringify(res.user));
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        this.currentUser.set(null);
        this.router.navigate(['/login']);
    }

    getToken() {
        return localStorage.getItem('access_token');
    }

    getUserFromStorage() {
        const data = localStorage.getItem('user_data');
        return data ? JSON.parse(data) : null;
    }

    refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        return this.httpClientForRefresh.post<any>(`${this.apiUrl}/refresh`, { refresh_token: refreshToken }).pipe(
            tap(res => {
                if (res.access_token) {
                    localStorage.setItem('access_token', res.access_token);
                    if (res.refresh_token) { // Optional rotation
                        localStorage.setItem('refresh_token', res.refresh_token);
                    }
                }
            })
        );
    }
}
