import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PolyRepoConfig } from './yaml.service';

export interface DeployRequest {
  targetId: number;
  projectId: string;
  yamlContent: string;
  repositoryUrl?: string;
  branch?: string;
  polyRepos?: PolyRepoConfig[];
  gitCredentialId?: number;
}

export interface DeployResponse {
  status: string;
  target: string;
  output: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrchestratorService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/orchestrator';

  deploy(request: DeployRequest): Observable<DeployResponse> {
    return this.http.post<DeployResponse>(`${this.apiUrl}/deploy`, request);
  }
}
