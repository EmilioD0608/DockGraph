import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Project {
    id?: number;
    uuid?: string;
    name: string;
    data: any;
    userId?: number;
    createdAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProjectsService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/projects';

    findAll(): Observable<Project[]> {
        return this.http.get<Project[]>(this.apiUrl);
    }

    findOne(id: number): Observable<Project> {
        return this.http.get<Project>(`${this.apiUrl}/${id}`);
    }

    create(project: { name: string; data: any }): Observable<Project> {
        return this.http.post<Project>(this.apiUrl, project);
    }

    update(id: number, project: { name?: string; data?: any }): Observable<Project> {
        return this.http.patch<Project>(`${this.apiUrl}/${id}`, project);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
