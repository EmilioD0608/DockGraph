import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, PlusCircle, Search, ArrowLeft, ChevronRight, Box, Trash2, Edit, Server, Database, Network, Scan } from 'lucide-angular';

@Component({
    selector: 'app-context-menu',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './context-menu.component.html',
    styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {
    @Input() x = 0;
    @Input() y = 0;
    @Input() set currentView(v: 'main' | 'add-node' | 'node-context') {
        this.view.set(v);
    }
    @Output() close = new EventEmitter<void>();
    @Output() action = new EventEmitter<string>();

    view = signal<'main' | 'add-node' | 'node-context'>('main');
    searchQuery = signal('');

    readonly icons = {
        plus: PlusCircle,
        search: Search,
        back: ArrowLeft,
        forward: ChevronRight,
        box: Box,
        trash: Trash2,
        edit: Edit,
        server: Server,
        db: Database,
        network: Network,
        scan: Scan
    };

    onAction(actionName: string) {
        this.action.emit(actionName);
        this.close.emit();
    }

    handleNestedAction(action: string) {
        this.action.emit(action);
        this.close.emit();
    }

    setView(v: 'main' | 'add-node') {
        this.view.set(v);
    }

    onSearch(e: Event) {
        const input = e.target as HTMLInputElement;
        this.searchQuery.set(input.value);
    }
}
