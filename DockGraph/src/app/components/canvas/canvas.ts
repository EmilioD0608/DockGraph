import { Component, signal, HostListener, HostBinding, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Box, Server, Database, Network, Layers, Globe, Hammer, Lock } from 'lucide-angular';

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

  @Input() selectedConnectionId: string | null = null;

  transform = signal({ x: 0, y: 0, scale: 1 });
  isDraggingCanvas = signal(false);

  // Connection Dragging
  dragConnection = signal<{ x1: number, y1: number, x2: number, y2: number, color: string } | null>(null);
  activeSocket: { nodeId: string, socketId: string, type: string, dir: string } | null = null;

  // Node dragging state
  activeNodeId: string | null = null;
  dragStart = { x: 0, y: 0 };
  nodeStart = { x: 0, y: 0 };

  readonly icons = { box: Box, server: Server, db: Database, network: Network, layers: Layers, globe: Globe, hammer: Hammer, lock: Lock };

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

  hasPorts(node: DockerNodeData): boolean {
    return !!(node.config.ports && node.config.ports.length > 0);
  }

  hasBuild(node: DockerNodeData): boolean {
    return !!node.config.build;
  }

  isExternal(node: DockerNodeData): boolean {
    return !!node.config.external;
  }

  isInternal(node: DockerNodeData): boolean {
    return !!node.config.internal;
  }

  private getMousePos(event: MouseEvent) {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const t = this.transform();
    return {
      x: (event.clientX - rect.left - t.x) / t.scale,
      y: (event.clientY - rect.top - t.y) / t.scale
    };
  }

  // Selection Area State
  isSelectionActive = false; // "Mode" active, next click starts selection
  selectionBox = signal<{ x: number, y: number, w: number, h: number } | null>(null);
  selectedNodeIds = signal<Set<string>>(new Set());

  startAreaSelection() {
    this.isSelectionActive = true;
  }

  get cursor() {
    if (this.isSelectionActive) return 'crosshair';
    return this.isDraggingCanvas() ? 'grabbing' : 'grab';
  }

  @HostListener('mousedown', ['$event'])
  onCanvasMouseDown(event: MouseEvent) {
    if (event.button === 0 && !this.activeNodeId && !this.activeSocket) {
      if (this.isSelectionActive) {
        // Start Selection Rectangle
        const pos = this.getMousePos(event);
        // Note: selection box is in canvas coordinates (scaled)
        // Actually, for drawing the DIV, we want them in DOM coordinates relative to canvas-content?
        // Wait, canvas-content is transformed. SVG is inside it. Node-card is inside it.
        // So selection box should also be inside canvas-content and use canvas coordinates.
        // pos is calculated as: (client - canvasRect - transform) / scale.
        // So pos is in "World" coordinates.
        this.startPosition = { x: pos.x, y: pos.y };
        this.selectionBox.set({ x: pos.x, y: pos.y, w: 0, h: 0 });
      } else {
        // Pan
        this.isDraggingCanvas.set(true);
        // Start pos for pan is client coords
        this.startPosition = { x: event.clientX, y: event.clientY };
        this.initialTransform = { ...this.transform() };

        // Click on background clears selection
        this.selectedNodeIds.set(new Set());
      }
    }
  }

  onNodeMouseDown(event: MouseEvent, node: DockerNodeData) {
    event.stopPropagation();
    if (event.button === 0) {
      // Selection Logic
      const currentSelection = this.selectedNodeIds();
      if (!currentSelection.has(node.id)) {
        // If clicking a node not in selection, clear previous and select this one
        // Unless we want shift-click?
        if (event.shiftKey || event.ctrlKey) {
          const newSet = new Set(currentSelection);
          newSet.add(node.id);
          this.selectedNodeIds.set(newSet);
        } else {
          this.selectedNodeIds.set(new Set([node.id]));
        }
      } else {
        // Node is already selected.
        if (event.shiftKey || event.ctrlKey) {
          const newSet = new Set(currentSelection);
          newSet.delete(node.id);
          this.selectedNodeIds.set(newSet);
          return; // Don't drag if we just deselected
        }
      }

      this.activeNodeId = node.id;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.nodeStart = { x: node.x, y: node.y };

      // Initialize drag start positions for all selected nodes
      this.dragStartMap.clear();
      this.selectedNodeIds().forEach(id => {
        const n = this.nodes.find(x => x.id === id);
        if (n) {
          this.dragStartMap.set(id, { x: n.x, y: n.y });
        }
      });
    }
  }

  onNodeContextMenu(event: MouseEvent, node: DockerNodeData) {
    event.stopPropagation();
    event.preventDefault();
    this.nodeRightClick.emit({ event, nodeId: node.id });
  }

  onSocketMouseDown(event: MouseEvent, node: DockerNodeData, socket: Socket) {
    event.stopPropagation();
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

      if (start.dir === 'out' && socket.dir === 'in') {
        sourceInfo = start;
        targetInfo = { nodeId: node.id, socketId: socket.id };
      }
      else if (start.dir === 'in' && socket.dir === 'out') {
        sourceInfo = { nodeId: node.id, socketId: socket.id, type: socket.type };
        targetInfo = start;
      }

      if (sourceInfo && targetInfo && this.isCompatible(start.type, socket.type)) {
        this.connectionCreated.emit({
          id: crypto.randomUUID(),
          sourceNodeId: sourceInfo.nodeId,
          sourceSocketId: sourceInfo.socketId!,
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

    // Box Selection Drag
    if (this.isSelectionActive && this.selectionBox()) {
      const pos = this.getMousePos(event);
      const startX = this.startPosition.x; // stored as world coord in mousedown
      const startY = this.startPosition.y;

      const x = Math.min(startX, pos.x);
      const y = Math.min(startY, pos.y);
      const w = Math.abs(pos.x - startX);
      const h = Math.abs(pos.y - startY);

      this.selectionBox.set({ x, y, w, h });
      return;
    }

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

      const selectedIds = this.selectedNodeIds();
      // If activeNode is selected, move ALL selected nodes
      if (selectedIds.has(this.activeNodeId)) {
        selectedIds.forEach(id => {
          const start = this.dragStartMap.get(id);
          if (start) {
            const node = this.nodes.find(n => n.id === id);
            if (node) {
              const updatedNode: DockerNodeData = {
                ...node, x: start.x + dx, y: start.y + dy
              };
              this.nodeMove.emit(updatedNode);
            }
          }
        });
      } else {
        // Normal single node drag (fallback)
        const node = this.nodes.find(n => n.id === this.activeNodeId);
        if (node) {
          const updatedNode: DockerNodeData = {
            ...node, x: this.nodeStart.x + dx, y: this.nodeStart.y + dy
          };
          this.nodeMove.emit(updatedNode);
        }
      }
    }

    // Connection Drag
    if (this.dragConnection() && this.activeSocket) {
      const pos = this.getMousePos(event);
      this.dragConnection.update(c => c ? { ...c, x2: pos.x, y2: pos.y } : null);
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();

    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const t = this.transform();

    // Mouse relative to canvas (pixels)
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    // Mouse world position (before zoom)
    const wx = (mx - t.x) / t.scale;
    const wy = (my - t.y) / t.scale;

    // Calculate new scale
    const factor = 1.1;
    const delta = -Math.sign(event.deltaY);
    let newScale = t.scale;

    if (delta > 0) {
      newScale *= factor;
    } else {
      newScale /= factor;
    }

    // Limits
    newScale = Math.min(Math.max(newScale, 0.1), 5);

    // Calculate new translation to maintain mouse position relative to world
    const newX = mx - (wx * newScale);
    const newY = my - (wy * newScale);

    this.transform.set({ x: newX, y: newY, scale: newScale });
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.isSelectionActive && this.selectionBox()) {
      // Finalize Selection
      const box = this.selectionBox()!;
      const selected = new Set<string>();

      this.nodes.forEach(node => {
        // Check intersection (simple AABB)
        const nodeW = 200; // Approximate
        const nodeH = (node.type === 'service') ? 120 : 40; // Approximate
        // Better to get real bounds if possible, but approximation is okay.
        // Using standard widths (200) and heights.

        // Check if Node overlaps Box
        if (node.x < box.x + box.w &&
          node.x + nodeW > box.x &&
          node.y < box.y + box.h &&
          node.y + nodeH > box.y) {
          selected.add(node.id);
        }
      });

      // Merge with existing if Shift? 
      // User workflow: "Select nodes in area". Usually replaces selection.
      this.selectedNodeIds.set(selected);

      this.selectionBox.set(null);
      this.isSelectionActive = false; // Turn off mode
    }

    this.isDraggingCanvas.set(false);
    this.activeNodeId = null;
    this.stopConnectionDrag();
    this.dragStartMap.clear(); // Clear map
  }

  // Helper map for multi-drag
  private dragStartMap = new Map<string, { x: number, y: number }>();


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

  getPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  // --- SOLUCIÓN ACTUALIZADA: SINCRONIZACIÓN PERFECTA ---
  getSocketPosition(nodeId: string, socketId: string): { x: number, y: number } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    // Alturas basadas en el tipo de nodo
    const isCompact = node.type === 'volume' || node.type === 'network';
    const HEADER_HEIGHT = isCompact ? 36 : 42;
    const SLOT_HEIGHT = isCompact ? 36 : 40;

    // --- Inputs ---
    let index = node.inputs.findIndex(s => s.id === socketId);
    if (index !== -1) {
      // Logic para inputs (lado izquierdo)
      const xOffset = -10; // Todos tienen el punto un poco salido a la izquierda
      const yOffset = (SLOT_HEIGHT / 2) + (index * SLOT_HEIGHT);

      return {
        x: node.x + xOffset,
        y: node.y + HEADER_HEIGHT + yOffset
      };
    }

    // --- Outputs ---
    index = node.outputs.findIndex(s => s.id === socketId);
    if (index !== -1) {
      const width = isCompact ? 160 : 200; // Updated width for compact nodes in CSS
      const yOffset = (SLOT_HEIGHT / 2) + (index * SLOT_HEIGHT);

      return {
        x: node.x + width + 10,
        y: node.y + HEADER_HEIGHT + yOffset
      };
    }

    return { x: node.x, y: node.y };
  }

  protected readonly Math = Math;
}