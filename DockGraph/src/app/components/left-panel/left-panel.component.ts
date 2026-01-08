import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Plus, Trash2, Save, Link, ArrowRight } from 'lucide-angular';
import { DockerNodeData, DockConnection } from '../../models/docker-node';

@Component({
    selector: 'app-left-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './left-panel.component.html',
    styleUrls: ['./left-panel.component.css']
})
export class LeftPanelComponent {
    @Input() nodes: DockerNodeData[] = [];
    @Input() connections: DockConnection[] = [];

    @Output() connectionCreate = new EventEmitter<{ sourceId: string, targetId: string }>();
    @Output() connectionUpdate = new EventEmitter<DockConnection>();
    @Output() connectionDelete = new EventEmitter<string>();

    isOpen = signal(true);

    readonly icons = {
        chevronLeft: ChevronLeft,
        chevronRight: ChevronRight,
        plus: Plus,
        trash: Trash2,
        save: Save,
        link: Link,
        arrowRight: ArrowRight
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
        if (confirm('¿Estás seguro de eliminar esta relación?')) {
            this.connectionDelete.emit(id);
        }
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
