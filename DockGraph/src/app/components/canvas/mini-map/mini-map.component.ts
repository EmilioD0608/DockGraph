import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockerNodeData } from '../../../models/docker-node';

@Component({
    selector: 'app-mini-map',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './mini-map.component.html',
    styleUrls: ['./mini-map.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiniMapComponent implements OnChanges {
    @Input() nodes: DockerNodeData[] = [];
    @Input() transform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 1 };
    @Input() canvasWidth: number = 0;
    @Input() canvasHeight: number = 0;

    // Mini-map configuration
    readonly mapWidth = 180;
    readonly mapHeight = 120;
    readonly padding = 100; // Extra padding in world coordinates

    // Computed state for rendering
    miniMapState = signal<{
        nodes: { x: number, y: number, w: number, h: number, color: string }[];
        viewport: { x: number, y: number, w: number, h: number };
        scale: number;
    }>({ nodes: [], viewport: { x: 0, y: 0, w: 0, h: 0 }, scale: 1 });

    ngOnChanges(changes: SimpleChanges): void {
        this.updateMap();
    }

    private updateMap() {
        // 1. Calculate World Bounds (Nodes)
        // Start with current viewport as minimum bounds to ensure we don't zoom in too crazy if no nodes
        // Or just start with Infinity.

        // Default bounds if no nodes
        let minX = -500;
        let minY = -500;
        let maxX = 500;
        let maxY = 500;

        if (this.nodes.length > 0) {
            minX = Infinity;
            minY = Infinity;
            maxX = -Infinity;
            maxY = -Infinity;

            this.nodes.forEach(node => {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                // Approximation of node sizes
                const w = node.type === 'volume' || node.type === 'network' ? 160 : 200;
                const h = node.type === 'volume' || node.type === 'network' ? 40 : 120;
                maxX = Math.max(maxX, node.x + w);
                maxY = Math.max(maxY, node.y + h);
            });
        }

        // Include the Viewport in the Bounds?
        // Usually mini-maps show the whole known "content", and the viewport rectangle moves within it.
        // However, if we pan far away, the viewport might go outside the "node bounds".
        // Should we expand bounds to include viewport? 
        // Yes, otherwise the viewport rect will disappear.

        const t = this.transform;
        // Current viewport in world coords
        // avoid division by zero
        const s = t.scale || 1;
        const vx = -t.x / s;
        const vy = -t.y / s;
        const vw = this.canvasWidth / s;
        const vh = this.canvasHeight / s;

        minX = Math.min(minX, vx);
        minY = Math.min(minY, vy);
        maxX = Math.max(maxX, vx + vw);
        maxY = Math.max(maxY, vy + vh);

        // Add padding to world bounds
        minX -= this.padding;
        minY -= this.padding;
        maxX += this.padding;
        maxY += this.padding;

        const worldW = Math.max(maxX - minX, 100); // Minimum size
        const worldH = Math.max(maxY - minY, 100);

        // 2. Calculate Scale to fit World in Mini-Map
        const scaleX = this.mapWidth / worldW;
        const scaleY = this.mapHeight / worldH;
        const scale = Math.min(scaleX, scaleY); // Uniform scale to fit

        // Center the content in the mini-map
        const mapContentW = worldW * scale;
        const mapContentH = worldH * scale;
        const offsetX = (this.mapWidth - mapContentW) / 2;
        const offsetY = (this.mapHeight - mapContentH) / 2;

        // Helper to project World -> MiniMap
        const project = (wx: number, wy: number) => ({
            x: (wx - minX) * scale + offsetX,
            y: (wy - minY) * scale + offsetY
        });

        // 3. Map Nodes
        const mappedNodes = this.nodes.map(node => {
            const w = node.type === 'volume' || node.type === 'network' ? 160 : 200;
            const h = node.type === 'volume' || node.type === 'network' ? 40 : 120;
            const pos = project(node.x, node.y);

            let color = '#64748b'; // service (slate-500)
            if (node.type === 'volume') color = '#10b981'; // emerald-500
            if (node.type === 'network') color = '#3b82f6'; // blue-500

            return {
                x: pos.x,
                y: pos.y,
                w: w * scale,
                h: h * scale,
                color
            };
        });

        // 4. Map Viewport
        const vPos = project(vx, vy);

        const viewportRect = {
            x: vPos.x,
            y: vPos.y,
            w: vw * scale,
            h: vh * scale
        };

        this.miniMapState.set({
            nodes: mappedNodes,
            viewport: viewportRect,
            scale
        });
    }
}
