
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LucideAngularModule, LogIn, Lock, Mail, Github, Chrome, AlertCircle } from 'lucide-angular';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);
    //user@example.com
    //password123
    email = signal('');
    password = signal('');
    isLoading = signal(false);
    errorMessage = signal('');

    readonly icons = { login: LogIn, lock: Lock, mail: Mail, github: Github, chrome: Chrome, alertCircle: AlertCircle };

    isRegister = signal(false);

    // ...

    toggleMode() {
        this.isRegister.update(v => !v);
        this.errorMessage.set('');
    }

    onSubmit() {
        this.isLoading.set(true);
        this.errorMessage.set('');

        const action$ = this.isRegister()
            ? this.authService.register(this.email(), this.password())
            : this.authService.login(this.email(), this.password());

        action$.subscribe({
            next: () => {
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.isLoading.set(false);
                this.errorMessage.set(
                    this.isRegister()
                        ? 'Error al registrarse. El email podría estar en uso.'
                        : 'Credenciales inválidas. Por favor intente de nuevo.'
                );
                console.error(err);
            }
        });
    }
}
