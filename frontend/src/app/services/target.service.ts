import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Target {
  id: number;
  uuid: string;
  name: string;
  host: string;
  username: string;
  port: number;
  status: string;
  createdAt: string;
}

export interface CreateTargetDto {
  name: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TargetService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/targets';

  findAll(): Observable<Target[]> {
    return this.http.get<Target[]>(this.apiUrl);
  }

  findOne(id: number): Observable<Target> {
    return this.http.get<Target>(`${this.apiUrl}/${id}`);
  }

  create(target: CreateTargetDto): Observable<Target> {
    return this.http.post<Target>(this.apiUrl, target);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
