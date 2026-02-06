import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, AlertTriangle, XCircle, CheckCircle } from 'lucide-angular';
import { ValidationIssue } from '../../services/validation.service';

@Component({
    selector: 'app-validation-dialog',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './validation-dialog.component.html',
    styleUrls: ['./validation-dialog.component.css']
})
export class ValidationDialogComponent {
    @Input() issues: ValidationIssue[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() export = new EventEmitter<void>();

    readonly icons = { error: XCircle, warning: AlertTriangle, success: CheckCircle };

    get errorCount() { return this.issues.filter(i => i.type === 'error').length; }
}
