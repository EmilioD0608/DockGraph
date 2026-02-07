import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TargetService, Target } from '../../services/target.service';
import { CredentialsService, Credential } from '../../services/credentials.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-targets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './targets.html',
  styleUrl: './targets.css',
})
export class TargetsComponent {
  private targetService = inject(TargetService);
  private credentialsService = inject(CredentialsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Tab State
  activeTab = signal<'servers' | 'credentials'>('servers');

  // Servers
  targets = signal<Target[]>([]);
  isLoading = signal(false);
  showForm = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
    host: ['', Validators.required],
    username: ['root', Validators.required],
    port: [22, Validators.required],
    password: [''],
    privateKey: ['']
  });

  // Credentials
  credentials = signal<Credential[]>([]);
  showCredForm = signal(false);
  credForm = this.fb.group({
    name: ['', Validators.required],
    type: ['git', Validators.required],
    username: [''],
    secret: ['', Validators.required]
  });

  constructor() {
    this.loadTargets();
    this.loadCredentials();
  }

  // --- Servers ---
  loadTargets() {
    this.isLoading.set(true);
    this.targetService.findAll().subscribe({
      next: (data) => {
        this.targets.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading targets', err);
        this.isLoading.set(false);
      }
    });
  }

  saveTarget() {
    if (this.form.invalid) return;

    const val = this.form.value;
    if (!val.password && !val.privateKey) {
      alert('Debes proporcionar una contraseña o una clave privada.');
      return;
    }

    this.isLoading.set(true);
    this.targetService.create(this.form.value as any).subscribe({
      next: (target) => {
        this.targets.update(list => [...list, target]);
        this.showForm.set(false);
        this.form.reset({ username: 'root', port: 22 });
        this.isLoading.set(false);
      },
      error: (err) => {
        alert('Error creando target: ' + err.message);
        this.isLoading.set(false);
      }
    });
  }

  deleteTarget(id: number) {
    if (!confirm('¿Estás seguro de eliminar este servidor?')) return;

    this.targetService.delete(id).subscribe({
      next: () => {
        this.targets.update(list => list.filter(t => t.id !== id));
      },
      error: (err) => alert('Error eliminando: ' + err.message)
    });
  }

  // --- Credentials ---
  loadCredentials() {
    this.credentialsService.getAll().subscribe({
      next: (data) => this.credentials.set(data),
      error: (err) => console.error('Error loading credentials', err)
    });
  }

  saveCredential() {
    if (this.credForm.invalid) return;

    this.isLoading.set(true);
    this.credentialsService.create(this.credForm.value as any).subscribe({
      next: (cred) => {
        this.credentials.update(list => [...list, cred]);
        this.showCredForm.set(false);
        this.credForm.reset({ type: 'git' });
        this.isLoading.set(false);
      },
      error: (err) => {
        alert('Error creando credencial: ' + err.message);
        this.isLoading.set(false);
      }
    });
  }

  deleteCredential(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta credencial?')) return;

    this.credentialsService.delete(id).subscribe({
      next: () => {
        this.credentials.update(list => list.filter(c => c.id !== id));
      },
      error: (err) => alert('Error eliminando: ' + err.message)
    });
  }

  goBack() {
    this.router.navigate(['/editor']);
  }
}

