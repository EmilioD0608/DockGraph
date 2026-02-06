import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Template {
    id?: number;
    uuid?: string;
    name: string;
    description: string;
    category: string;
    config: any;
}

@Injectable({
    providedIn: 'root'
})
export class TemplateService {
    private apiUrl = 'http://localhost:3000/templates';

    constructor(private http: HttpClient) { }

    getTemplates(): Observable<Template[]> {
        return this.http.get<Template[]>(this.apiUrl);
    }
}
