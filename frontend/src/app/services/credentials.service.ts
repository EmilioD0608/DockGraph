import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Credential {
    id: number;
    uuid: string;
    name: string;
    type: string; // 'git' | 'docker-registry'
    username?: string;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class CredentialsService {
    private apiUrl = 'http://localhost:3000/credentials';
    private http = inject(HttpClient);

    getAll(): Observable<Credential[]> {
        return this.http.get<Credential[]>(this.apiUrl);
    }

    create(data: { name: string; type: string; username?: string; secret: string }): Observable<Credential> {
        return this.http.post<Credential>(this.apiUrl, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
