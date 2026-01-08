import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="modal-overlay" *ngIf="visible">
        <div class="modal-content glass-panel">
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" (click)="onCancel()">{{ cancelText }}</button>
                <button class="btn btn-primary" (click)="onConfirm()">{{ confirmText }}</button>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    }

    .modal-content {
        background: #1e1e20;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        color: white;
    }

    h3 {
        margin: 0 0 1rem 0;
        font-size: 1.25rem;
        font-family: 'Quicksand', sans-serif;
    }

    p {
        color: #a1a1aa;
        margin-bottom: 2rem;
        line-height: 1.5;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
    }

    .btn {
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        font-size: 0.9rem;
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .btn-primary {
        background: #ef4444; /* Danger color by default for delete actions usually, or primary brand */
        color: white;
    }

    .btn-primary:hover {
        background: #dc2626;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
  `]
})
export class ConfirmDialogComponent {
    @Input() visible = false;
    @Input() title = 'Confirmación';
    @Input() message = '¿Estás seguro de continuar?';
    @Input() confirmText = 'Confirmar';
    @Input() cancelText = 'Cancelar';

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm() {
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}
