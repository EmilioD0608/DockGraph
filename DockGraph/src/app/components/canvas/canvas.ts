import { Component, signal, HostListener, HostBinding, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Box, Server, Database, Network, Layers } from 'lucide-angular';
import { DockerNodeData, DockConnection, Socket } from '../../models/docker-node';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './canvas.html',
  styleUrls: ['./canvas.css'],
})
export class Canvas {
  @Input() nodes: DockerNodeData[] = [];
  @Input() connections: DockConnection[] = [];
  @Output() nodeMove = new EventEmitter<DockerNodeData>();
  @Output() nodeRightClick = new EventEmitter<{ event: MouseEvent, nodeId: string }>();
  @Output() connectionCreated = new EventEmitter<DockConnection>();

  transform = signal({ x: 0, y: 0, scale: 1 });
  isDraggingCanvas = signal(false);

  // Connection Dragging
  dragConnection = signal<{ x1: number, y1: number, x2: number, y2: number, color: string } | null>(null);
  activeSocket: { nodeId: string, socketId: string, type: string, dir: string } | null = null;

  // Node dragging state
  activeNodeId: string | null = null;
  dragStart = { x: 0, y: 0 };
  nodeStart = { x: 0, y: 0 };

  readonly icons = { box: Box, server: Server, db: Database, network: Network, layers: Layers };

  private startPosition = { x: 0, y: 0 };
  private initialTransform = { x: 0, y: 0 };

  constructor(private elementRef: ElementRef) { }

  getSocketIcon(type: string): any {
    switch (type) {
      case 'dependency': return this.icons.layers;
      case 'volume': return this.icons.db;
      case 'network': return this.icons.network;
      default: return this.icons.box;
    }
  }

  private getMousePos(event: MouseEvent) {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const t = this.transform();
    return {
      x: (event.clientX - rect.left - t.x) / t.scale,
      y: (event.clientY - rect.top - t.y) / t.scale
    };
  }

  @HostBinding('style.cursor')
  get cursor() {
    return this.isDraggingCanvas() ? 'grabbing' : 'grab';
  }

  @HostListener('mousedown', ['$event'])
  onCanvasMouseDown(event: MouseEvent) {
    if (event.button === 0 && !this.activeNodeId && !this.activeSocket) {
      this.isDraggingCanvas.set(true);
      this.startPosition = { x: event.clientX, y: event.clientY };
      this.initialTransform = { ...this.transform() };
    }
  }

  onNodeMouseDown(event: MouseEvent, node: DockerNodeData) {
    event.stopPropagation();
    if (event.button === 0) {
      this.activeNodeId = node.id;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.nodeStart = { x: node.x, y: node.y };
    }
  }

  onNodeContextMenu(event: MouseEvent, node: DockerNodeData) {
    event.stopPropagation();
    event.preventDefault();
    this.nodeRightClick.emit({ event, nodeId: node.id });
  }

  onSocketMouseDown(event: MouseEvent, node: DockerNodeData, socket: Socket) {
    event.stopPropagation();
    // Allow dragging from both 'in' and 'out' sockets
    this.activeSocket = { nodeId: node.id, socketId: socket.id, type: socket.type, dir: socket.dir };

    const pos = this.getMousePos(event);

    this.dragConnection.set({
      x1: pos.x, y1: pos.y,
      x2: pos.x, y2: pos.y,
      color: this.getSocketColor(socket.type)
    });
  }

  onSocketMouseUp(event: MouseEvent, node: DockerNodeData, socket: Socket) {
    event.stopPropagation();
    const start = this.activeSocket;

    if (start && start.nodeId !== node.id) {
      let sourceInfo, targetInfo;

      // Case 1: Dragged from Output to Input
      if (start.dir === 'out' && socket.dir === 'in') {
        sourceInfo = start;
        targetInfo = { nodeId: node.id, socketId: socket.id };
      }
      // Case 2: Dragged from Input to Output (Reverse connection)
      else if (start.dir === 'in' && socket.dir === 'out') {
        sourceInfo = { nodeId: node.id, socketId: socket.id, type: socket.type };
        targetInfo = start;
      }

      if (sourceInfo && targetInfo && this.isCompatible(start.type, socket.type)) {
        this.connectionCreated.emit({
          id: crypto.randomUUID(),
          sourceNodeId: sourceInfo.nodeId,
          sourceSocketId: sourceInfo.socketId!, // '!' because logic ensures it exists
          targetNodeId: targetInfo.nodeId,
          targetSocketId: targetInfo.socketId!
        });
      }
    }
    this.stopConnectionDrag();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const t = this.transform();

    // Canvas Pan
    if (this.isDraggingCanvas()) {
      const dx = event.clientX - this.startPosition.x;
      const dy = event.clientY - this.startPosition.y;
      this.transform.set({
        ...t, x: this.initialTransform.x + dx, y: this.initialTransform.y + dy
      });
    }

    // Node Drag
    if (this.activeNodeId) {
      const dx = (event.clientX - this.dragStart.x) / t.scale;
      const dy = (event.clientY - this.dragStart.y) / t.scale;

      const node = this.nodes.find(n => n.id === this.activeNodeId);
      if (node) {
        const updatedNode: DockerNodeData = {
          ...node, x: this.nodeStart.x + dx, y: this.nodeStart.y + dy
        };
        this.nodeMove.emit(updatedNode);
      }
    }

    // Connection Drag
    if (this.dragConnection() && this.activeSocket) {
      const pos = this.getMousePos(event);

      // Update x2, y2 only
      this.dragConnection.update(c => c ? { ...c, x2: pos.x, y2: pos.y } : null);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDraggingCanvas.set(false);
    this.activeNodeId = null;
    this.stopConnectionDrag();
  }

  stopConnectionDrag() {
    this.activeSocket = null;
    this.dragConnection.set(null);
  }

  getSocketColor(type: string): string {
    switch (type) {
      case 'dependency': return '#F59E0B'; // Yellow
      case 'volume': return '#10B981';     // Green
      case 'network': return '#3B82F6';    // Blue
      default: return '#ccc';
    }
  }

  isCompatible(sourceType: string, targetType: string): boolean {
    // Logic: Service -> Service (Dep), Service -> Volume (Vol), Service -> Network (Net)
    // socket.type maps one-to-one here conveniently
    return sourceType === targetType;
  }

  getConnectionColor(conn: DockConnection): string {
    const node = this.nodes.find(n => n.id === conn.sourceNodeId);
    if (!node) return '#999';
    const socket = node.outputs.find(s => s.id === conn.sourceSocketId) ||
      node.inputs.find(s => s.id === conn.sourceSocketId);
    return socket ? this.getSocketColor(socket.type) : '#999';
  }

  isSocketConnected(nodeId: string, socketId: string): boolean {
    return this.connections.some(c =>
      (c.sourceNodeId === nodeId && c.sourceSocketId === socketId) ||
      (c.targetNodeId === nodeId && c.targetSocketId === socketId)
    );
  }

  // Helpers for line drawing
  getPath(x1: number, y1: number, x2: number, y2: number): string {
    // Bezier curve
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  getSocketPosition(nodeId: string, socketId: string): { x: number, y: number } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    // Calculate offset index
    // Header height: ~40px
    // Body padding: 12px
    // Socket height: 24px
    // Gap between sockets: 12px (defined in CSS .sockets-column gap: 12px)
    // Total vertical step per socket = 24 + 12 = 36px
    // Base Y offset (center of first socket) = Header(40) + Padding(12) + HalfSocket(12) = 64px

    let index = node.inputs.findIndex(s => s.id === socketId);
    if (index !== -1) {
      // Input socket position:
      // X: node.x - 8
      // Y: node.y + 64 + (index * 36)
      return { x: node.x - 8, y: node.y + 64 + (index * 36) };
    }

    index = node.outputs.findIndex(s => s.id === socketId);
    if (index !== -1) {
      // Output socket position:
      // X: node.x + width + 12
      // Y: node.y + 64 + (index * 36)
      const width = (node.type === 'volume' || node.type === 'network') ? 180 : 200;
      return { x: node.x + width + 12, y: node.y + 64 + (index * 36) };
    }
    return { x: node.x, y: node.y };
  }
}
