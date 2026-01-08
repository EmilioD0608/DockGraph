import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Plus, Trash2, Save, Link, ArrowRight, Settings, GitBranch } from 'lucide-angular';
import { DockerNodeData, DockConnection } from '../../models/docker-node';

import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-left-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, ConfirmDialogComponent],
    templateUrl: './left-panel.component.html',
    styleUrls: ['./left-panel.component.css']
})
export class LeftPanelComponent {
    @Input() nodes: DockerNodeData[] = [];
    @Input() connections: DockConnection[] = [];
    @Input() selectedConnectionId: string | null = null;

    @Output() connectionCreate = new EventEmitter<{ sourceId: string, targetId: string }>();
    @Output() connectionUpdate = new EventEmitter<DockConnection>();
    @Output() connectionDelete = new EventEmitter<string>();
    @Output() connectionSelect = new EventEmitter<string>();

    isOpen = signal(true);
    activeTab = signal<'relations' | 'settings'>('relations');

    // Dialog State
    dialogVisible = false;
    itemToDelete: string | null = null;

    readonly icons = {
        chevronLeft: ChevronLeft,
        chevronRight: ChevronRight,
        plus: Plus,
        trash: Trash2,
        save: Save,
        link: Link,
        arrowRight: ArrowRight,
        settings: Settings,
        branch: GitBranch
    };

    newConnSourceId = signal('');
    newConnTargetId = signal('');

    // Valid sources are currently only Services
    get sources() {
        return this.nodes.filter(n => n.type === 'service');
    }

    // Targets depend on selected source
    get targets() {
        const sId = this.newConnSourceId();
        if (!sId) return [];
        return this.nodes.filter(n => n.id !== sId);
    }

    toggle() {
        this.isOpen.update(v => !v);
    }

    selectTab(tab: 'relations' | 'settings') {
        this.activeTab.set(tab);
        this.isOpen.set(true);
    }

    create() {
        if (this.newConnSourceId() && this.newConnTargetId()) {
            this.connectionCreate.emit({
                sourceId: this.newConnSourceId(),
                targetId: this.newConnTargetId()
            });
            this.newConnSourceId.set('');
            this.newConnTargetId.set('');
        }
    }

    updateName(conn: DockConnection, name: string) {
        this.connectionUpdate.emit({ ...conn, name });
    }

    deleteConn(id: string) {
        this.itemToDelete = id;
        this.dialogVisible = true;
    }

    onConfirmDelete() {
        if (this.itemToDelete) {
            this.connectionDelete.emit(this.itemToDelete);
            this.itemToDelete = null;
        }
        this.dialogVisible = false;
    }

    onCancelDelete() {
        this.itemToDelete = null;
        this.dialogVisible = false;
    }

    getNodeLabel(id: string): string {
        const n = this.nodes.find(node => node.id === id);
        return n ? n.label : 'Unknown';
    }

    getConnectionClass(conn: DockConnection): string {
        const targetNode = this.nodes.find(n => n.id === conn.targetNodeId);
        if (!targetNode) return '';

        // Determine type based on target node logic matching Canvas colors
        if (targetNode.type === 'service') return 'dependency';
        if (targetNode.type === 'volume') return 'volume';
        if (targetNode.type === 'network') return 'network';

        return '';
    }
}
