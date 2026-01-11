import { Component, signal, HostListener, ViewChild, effect, computed, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Download, Upload, Plus } from 'lucide-angular';
import * as yaml from 'js-yaml';

import { Canvas } from '../../components/canvas/canvas';
import { ContextMenuComponent } from '../../components/context-menu/context-menu.component';
import { NodeEditorComponent } from '../../components/node-editor/node-editor.component';
import { LeftPanelComponent } from '../../components/left-panel/left-panel.component';
import { DockerNodeData, DockConnection, Socket } from '../../models/docker-node';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, Canvas, ContextMenuComponent, NodeEditorComponent, LeftPanelComponent, ConfirmDialogComponent],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.css'
})
export class EditorComponent implements OnInit {
    @ViewChild(Canvas) canvasRef!: Canvas;

    readonly icons = { download: Download, upload: Upload, plus: Plus };

    isMenuOpen = signal(false);
    isImportModalOpen = signal(false);
    isDarkMode = signal(true);

    // Project System Signals
    isProjectModalOpen = signal(false);
    isNewProjectWarningOpen = signal(false);

    projectData = signal({
        name: '',
        tech: 'docker-compose'
    });

    nodes = signal<DockerNodeData[]>([]);
    connections = signal<DockConnection[]>([]);

    selectedConnectionId = signal<string | null>(null);

    editingNode = signal<DockerNodeData | null>(null);

    // Computed: Connected volumes for the currently editing node
    connectedVolumes = computed(() => {
        const node = this.editingNode();
        if (!node || node.type !== 'service') return [];

        return this.connections()
            .filter(c => c.sourceNodeId === node.id)
            .map(c => this.nodes().find(n => n.id === c.targetNodeId))
            .filter((n): n is DockerNodeData => !!n && n.type === 'volume')
            .map(v => ({ id: v.id, label: v.label }));
    });

    contextMenu = signal<{ x: number, y: number, visible: boolean, view: 'main' | 'add-node' | 'node-context', data?: any }>({
        x: 0, y: 0, visible: false, view: 'main'
    });

    constructor() {
        const savedNodes = localStorage.getItem('dockgraph-nodes');
        const savedConns = localStorage.getItem('dockgraph-connections');
        const savedProject = localStorage.getItem('dockgraph-project');

        if (savedNodes) {
            try { this.nodes.set(JSON.parse(savedNodes)); } catch (e) { console.error(e); }
        }
        if (savedConns) {
            try { this.connections.set(JSON.parse(savedConns)); } catch (e) { console.error(e); }
        }

        if (savedProject) {
            try {
                const proj = JSON.parse(savedProject);
                this.projectData.set(proj);
            } catch (e) { console.error(e); }
        }

        effect(() => {
            localStorage.setItem('dockgraph-nodes', JSON.stringify(this.nodes()));
            localStorage.setItem('dockgraph-connections', JSON.stringify(this.connections()));
            localStorage.setItem('dockgraph-project', JSON.stringify(this.projectData()));
        });
    }

    ngOnInit() {
        // If no project name is set, show the creation modal at start
        if (!this.projectData().name) {
            this.isProjectModalOpen.set(true);
        }
    }

    // Project System Methods
    openNewProjectWarning() {
        this.isNewProjectWarningOpen.set(true);
    }

    cancelNewProject() {
        this.isNewProjectWarningOpen.set(false);
    }

    updateProjectName(name: string) {
        this.projectData.update(current => ({ ...current, name }));
    }

    setProjectTech(tech: string) {
        this.projectData.update(current => ({ ...current, tech }));
    }


    confirmNewProject() {
        this.isNewProjectWarningOpen.set(false);
        // Reset form
        this.projectData.set({ name: '', tech: 'docker-compose' });
        this.isProjectModalOpen.set(true);
    }

    createProject() {
        if (!this.projectData().name) return;

        // Clear current canvas
        this.nodes.set([]);
        this.connections.set([]);
        this.selectedConnectionId.set(null);
        this.editingNode.set(null);

        // Close modal
        this.isProjectModalOpen.set(false);

        // LocalStorage will be updated by effect
    }


    toggleMenu() {
        this.isMenuOpen.update(value => !value);
    }

    toggleDarkMode() {
        this.isDarkMode.update(value => !value);
    }

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent) {
        event.preventDefault();
        this.contextMenu.set({ x: event.clientX, y: event.clientY, visible: true, view: 'main' });
    }

    handleNodeContextMenu({ event, nodeId }: { event: MouseEvent, nodeId: string }) {
        this.contextMenu.set({
            x: event.clientX,
            y: event.clientY,
            visible: true,
            view: 'node-context',
            data: { nodeId }
        });
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        // If clicking outside, close context menu
        // Check if click is inside the context menu itself needs to be handled if we want to keep it open on click inside
        // But usually we close it on any click outside.
        // The context menu usually stops propagation if clicked inside?

        // Actually, onDocumentClick is called for *every* click. 
        // We just want to check:
        // 1. Close context menu (handled by logic below)
        // 2. Deselect connection if click is outside panel.

        if (this.contextMenu().visible) {
            this.closeContextMenu();
        }

        const target = event.target as Element;
        // Check if target exists (it might be null if event is synthesized or void)
        if (target) {
            const insidePanel = target.closest('app-left-panel');
            if (!insidePanel && this.selectedConnectionId()) {
                this.selectedConnectionId.set(null);
            }
        }
    }

    closeContextMenu() {
        if (this.contextMenu().visible) {
            this.contextMenu.update(prev => ({ ...prev, visible: false }));
        }
    }

    handleContextMenuAction(action: string) {
        const { x, y } = this.contextMenu();
        const data = this.contextMenu().data;

        if (action === 'add-node:service') {
            this.addServiceNode(x, y);
        }
        else if (action === 'select-area') {
            this.canvasRef.startAreaSelection();
        }
        else if (action === 'add-node:volume') {
            this.addVolumeNode(x, y);
        }
        else if (action === 'add-node:network') {
            this.addNetworkNode(x, y);
        }
        else if (action === 'delete-node') {
            if (data?.nodeId) {
                const selectedIds = this.canvasRef.selectedNodeIds();
                const nodesToDelete = new Set<string>();

                if (selectedIds.has(data.nodeId)) {
                    // Si el nodo clickeado está en la selección, borramos TODOS los seleccionados
                    selectedIds.forEach(id => nodesToDelete.add(id));
                } else {
                    // Si no, borramos solo ese
                    nodesToDelete.add(data.nodeId);
                }

                this.nodes.update(curr => curr.filter(n => !nodesToDelete.has(n.id)));

                // Eliminar conexiones de cualquiera de los nodos borrados
                this.connections.update(curr => curr.filter(c =>
                    !nodesToDelete.has(c.sourceNodeId) && !nodesToDelete.has(c.targetNodeId)
                ));

                // Limpiar selección
                this.canvasRef.selectedNodeIds.set(new Set());
            }
        }
        else if (action === 'edit-node') {
            const node = this.nodes().find(n => n.id === data?.nodeId);
            if (node) {
                this.editingNode.set(node);
            }
        }
    }

    updateNode(updatedNode: DockerNodeData) {
        this.nodes.update(curr => curr.map(n => n.id === updatedNode.id ? updatedNode : n));
    }

    handleConnectionCreate(conn: DockConnection) {
        this.connections.update(curr => [...curr, conn]);
    }

    // Left Panel Handlers
    handlePanelConnectionCreate(event: { sourceId: string, targetId: string }) {
        const sourceNode = this.nodes().find(n => n.id === event.sourceId);
        const targetNode = this.nodes().find(n => n.id === event.targetId);

        if (!sourceNode || !targetNode) return;

        let sourceSocketId: string | undefined;
        let targetSocketId: string | undefined;

        // Logic to determine sockets based on types
        if (sourceNode.type === 'service' && targetNode.type === 'service') {
            // Dependency
            sourceSocketId = sourceNode.outputs.find(s => s.type === 'dependency')?.id;
            targetSocketId = targetNode.inputs.find(s => s.type === 'dependency')?.id;
        } else if (sourceNode.type === 'service' && targetNode.type === 'volume') {
            // Volume Mount
            sourceSocketId = sourceNode.outputs.find(s => s.type === 'volume')?.id;
            targetSocketId = targetNode.inputs.find(s => s.type === 'volume')?.id;
        } else if (sourceNode.type === 'service' && targetNode.type === 'network') {
            // Network Membership
            sourceSocketId = sourceNode.outputs.find(s => s.type === 'network')?.id;
            targetSocketId = targetNode.inputs.find(s => s.type === 'network')?.id;
        }

        if (sourceSocketId && targetSocketId) {
            // Check if exists
            const exists = this.connections().some(c =>
                c.sourceNodeId === event.sourceId &&
                c.targetNodeId === event.targetId &&
                c.sourceSocketId === sourceSocketId &&
                c.targetSocketId === targetSocketId
            );

            if (!exists) {
                const newConn: DockConnection = {
                    id: crypto.randomUUID(),
                    sourceNodeId: event.sourceId,
                    targetNodeId: event.targetId,
                    sourceSocketId: sourceSocketId,
                    targetSocketId: targetSocketId
                };
                this.connections.update(curr => [...curr, newConn]);
            } else {
                alert('La relación ya existe.');
            }
        } else {
            alert('No se pudo determinar una conexión válida entre estos nodos.');
        }
    }

    handlePanelConnectionUpdate(updatedConn: DockConnection) {
        this.connections.update(curr =>
            curr.map(c => c.id === updatedConn.id ? updatedConn : c)
        );
    }

    handlePanelConnectionDelete(connId: string) {
        this.connections.update(curr => curr.filter(c => c.id !== connId));
        if (this.selectedConnectionId() === connId) {
            this.selectedConnectionId.set(null);
        }
    }

    handlePanelConnectionSelect(connId: string) {
        this.selectedConnectionId.set(connId);
    }

    private getCanvasPoint(clientX: number, clientY: number) {
        if (!this.canvasRef) return { x: 0, y: 0 };
        const t = this.canvasRef.transform();
        return {
            x: (clientX - t.x) / t.scale,
            y: (clientY - t.y) / t.scale
        };
    }

    addServiceNode(cx: number, cy: number) {
        const p = this.getCanvasPoint(cx, cy);
        const newNode: DockerNodeData = {
            id: crypto.randomUUID(), type: 'service', label: 'Service', x: p.x, y: p.y,
            inputs: [
                { id: crypto.randomUUID(), type: 'dependency', dir: 'in', label: 'Dep In' }
            ],
            outputs: [
                { id: crypto.randomUUID(), type: 'dependency', dir: 'out', label: 'Dep Out' },
                { id: crypto.randomUUID(), type: 'volume', dir: 'out', label: 'Vol Out' },
                { id: crypto.randomUUID(), type: 'network', dir: 'out', label: 'Net Out' }
            ],
            config: { image: 'nginx:latest' }
        };
        this.nodes.update(curr => [...curr, newNode]);
    }

    addVolumeNode(cx: number, cy: number) {
        const p = this.getCanvasPoint(cx, cy);
        const newNode: DockerNodeData = {
            id: crypto.randomUUID(), type: 'volume', label: 'Volume', x: p.x, y: p.y,
            inputs: [
                { id: crypto.randomUUID(), type: 'volume', dir: 'in', label: 'Mount' }
            ],
            outputs: [],
            config: {}
        };
        this.nodes.update(curr => [...curr, newNode]);
    }

    addNetworkNode(cx: number, cy: number) {
        const p = this.getCanvasPoint(cx, cy);
        const newNode: DockerNodeData = {
            id: crypto.randomUUID(), type: 'network', label: 'Network', x: p.x, y: p.y,
            inputs: [
                { id: crypto.randomUUID(), type: 'network', dir: 'in', label: 'Member' }
            ],
            outputs: [],
            config: {}
        };
        this.nodes.update(curr => [...curr, newNode]);
    }

    closeEditor() {
        this.editingNode.set(null);
    }

    saveNodeEditor(updatedNode: DockerNodeData) {
        this.updateNode(updatedNode);
        this.closeEditor();
    }

    exportYaml() {
        const nodes = this.nodes();
        const connections = this.connections();

        // Map node.id -> unique, sanitized name
        const nodeNameMap = new Map<string, string>();
        const usedNames = new Set<string>();

        // Helper to generate unique name
        const getUniqueName = (baseName: string) => {
            // Sanitize: lowercase, replace spaces/specials with underscores
            let name = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            if (!name) name = 'node';

            let uniqueName = name;
            let counter = 1;
            while (usedNames.has(uniqueName)) {
                uniqueName = `${name}_${counter}`;
                counter++;
            }
            usedNames.add(uniqueName);
            return uniqueName;
        };

        // 1. Build Name Map
        nodes.forEach(node => {
            const safeName = getUniqueName(node.label);
            nodeNameMap.set(node.id, safeName);
        });

        const services: any = {};
        const volumes: Set<string> = new Set();
        const networks: Set<string> = new Set();

        // 2. Initialize Structures
        nodes.forEach(node => {
            const name = nodeNameMap.get(node.id)!;

            if (node.type === 'service') {
                const svc: any = {
                    restart: node.config.restart || 'no',
                };

                // Build vs Image
                if (node.config.build) {
                    svc.build = typeof node.config.build === 'string' ? node.config.build : { ...node.config.build };
                } else {
                    svc.image = node.config.image || 'nginx:latest';
                }

                // Optional Basic Fields
                if (node.config.container_name) svc.container_name = node.config.container_name;
                if (node.config.ports && node.config.ports.length > 0) svc.ports = [...node.config.ports];
                if (node.config.expose && node.config.expose.length > 0) svc.expose = [...node.config.expose];
                if (node.config.environment && Object.keys(node.config.environment).length > 0) svc.environment = { ...node.config.environment };
                // Explicit Volumes list (bind mounts)
                if (node.config.volumes && node.config.volumes.length > 0) svc.volumes = [...node.config.volumes];

                // Resources
                if (node.config.deploy?.resources?.limits?.cpus || node.config.deploy?.resources?.limits?.memory) {
                    svc.deploy = { resources: { limits: {} } };
                    if (node.config.deploy.resources.limits.cpus) svc.deploy.resources.limits.cpus = node.config.deploy.resources.limits.cpus;
                    if (node.config.deploy.resources.limits.memory) svc.deploy.resources.limits.memory = node.config.deploy.resources.limits.memory;
                }

                if (node.config.healthcheck) {
                    svc.healthcheck = { ...node.config.healthcheck };
                }

                services[name] = svc;
            } else if (node.type === 'volume') {
                volumes.add(name);
            } else if (node.type === 'network') {
                networks.add(name);
            }
        });

        // 3. Process Connections
        connections.forEach(conn => {
            const sourceName = nodeNameMap.get(conn.sourceNodeId);
            const targetName = nodeNameMap.get(conn.targetNodeId);
            const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = nodes.find(n => n.id === conn.targetNodeId);

            if (!sourceName || !targetName || !sourceNode || !targetNode) return;

            // Service -> Service (Depends On)
            if (sourceNode.type === 'service' && targetNode.type === 'service') {
                if (!services[sourceName].depends_on) services[sourceName].depends_on = [];
                if (!services[sourceName].depends_on.includes(targetName)) {
                    services[sourceName].depends_on.push(targetName);
                }
            }

            // Service -> Volume
            if (sourceNode.type === 'service' && targetNode.type === 'volume') {
                if (!services[sourceName].volumes) services[sourceName].volumes = [];
                // Check if already mounted
                const hasMount = services[sourceName].volumes.some((v: string) => v.startsWith(targetName + ':'));

                if (!hasMount) {
                    // Use Dynamic Target Config from Service Node
                    const targetPath = sourceNode.config.volumeMounts?.[targetNode.id] || '/app/data';
                    services[sourceName].volumes.push(`${targetName}:${targetPath}`);
                }
            }

            // Service -> Network
            if (sourceNode.type === 'service' && targetNode.type === 'network') {
                if (!services[sourceName].networks) services[sourceName].networks = [];
                if (!services[sourceName].networks.includes(targetName)) {
                    services[sourceName].networks.push(targetName);
                }
            }
        });

        // 4. Construct YAML
        let yaml = 'version: "3.8"\n\n';

        // Services
        if (Object.keys(services).length > 0) {
            yaml += 'services:\n';
            for (const [name, svc] of Object.entries(services)) {
                yaml += `  ${name}:\n`;
                if ((svc as any).image) yaml += `    image: ${(svc as any).image}\n`;

                // Build Support
                if ((svc as any).build) {
                    if (typeof (svc as any).build === 'string') {
                        yaml += `    build: ${(svc as any).build}\n`;
                    } else {
                        yaml += `    build:\n`;
                        yaml += `      context: ${(svc as any).build.context}\n`;
                        if ((svc as any).build.dockerfile) yaml += `      dockerfile: ${(svc as any).build.dockerfile}\n`;
                    }
                }

                if ((svc as any).container_name) yaml += `    container_name: ${(svc as any).container_name}\n`;

                // Deploy Resources Support
                if ((svc as any).deploy) {
                    yaml += `    deploy:\n`;
                    yaml += `      resources:\n`;
                    yaml += `        limits:\n`;
                    if ((svc as any).deploy.resources.limits.cpus) yaml += `          cpus: '${(svc as any).deploy.resources.limits.cpus}'\n`;
                    if ((svc as any).deploy.resources.limits.memory) yaml += `          memory: ${(svc as any).deploy.resources.limits.memory}\n`;
                }

                // Healthcheck Support
                if ((svc as any).healthcheck) {
                    yaml += `    healthcheck:\n`;
                    // Check if test is array or string, but we saved it as array ["CMD-SHELL", "cmd"]
                    const testCmd = (svc as any).healthcheck.test;
                    if (Array.isArray(testCmd)) {
                        yaml += `      test: ["${testCmd[0]}", "${testCmd[1]}"]\n`;
                    } else {
                        yaml += `      test: ${testCmd}\n`;
                    }
                    yaml += `      interval: ${(svc as any).healthcheck.interval}\n`;
                    yaml += `      timeout: ${(svc as any).healthcheck.timeout}\n`;
                    yaml += `      retries: ${(svc as any).healthcheck.retries}\n`;
                    if ((svc as any).healthcheck.start_period) yaml += `      start_period: ${(svc as any).healthcheck.start_period}\n`;
                }

                if ((svc as any).restart) yaml += `    restart: ${(svc as any).restart}\n`;

                if ((svc as any).ports) {
                    yaml += `    ports:\n`;
                    (svc as any).ports.forEach((p: string) => yaml += `      - "${p}"\n`);
                }
                if ((svc as any).expose) {
                    yaml += `    expose:\n`;
                    (svc as any).expose.forEach((p: string) => yaml += `      - "${p}"\n`);
                }
                if ((svc as any).environment) {
                    yaml += `    environment:\n`;
                    for (const [k, v] of Object.entries((svc as any).environment)) {
                        yaml += `      ${k}: "${v}"\n`;
                    }
                }
                if ((svc as any).volumes) {
                    yaml += `    volumes:\n`;
                    (svc as any).volumes.forEach((v: string) => yaml += `      - ${v}\n`);
                }
                if ((svc as any).depends_on) {
                    yaml += `    depends_on:\n`;
                    (svc as any).depends_on.forEach((d: string) => yaml += `      - ${d}\n`);
                }
                if ((svc as any).networks) {
                    yaml += `    networks:\n`;
                    (svc as any).networks.forEach((n: string) => yaml += `      - ${n}\n`);
                }
                yaml += '\n';
            }
        }

        // Top-level Volumes
        if (volumes.size > 0) {
            yaml += 'volumes:\n';
            volumes.forEach(vName => {
                // Find node to get real config
                // We need to reverse map name -> ID or just find by name
                // Effecient way: iterate nodes again or store node ref in map.
                // Simpler: iterate nodes, checked if mapped name matches.

                const node = nodes.find(n => nodeNameMap.get(n.id) === vName);
                if (!node || node.type !== 'volume') {
                    // Fallback
                    yaml += `  ${vName}:\n`;
                    return;
                }

                yaml += `  ${vName}:\n`;
                if (node.config.driver && node.config.driver !== 'local') yaml += `    driver: ${node.config.driver}\n`;

                if (node.config.external) {
                    yaml += `    external: true\n`;
                    if (node.config.name) yaml += `    name: ${node.config.name}\n`;
                } else {
                    if (node.config.driverOpts && Object.keys(node.config.driverOpts).length > 0) {
                        yaml += `    driver_opts:\n`;
                        for (const [k, val] of Object.entries(node.config.driverOpts)) {
                            yaml += `      ${k}: "${val}"\n`;
                        }
                    }
                }
            });
            yaml += '\n';
        }

        // Top-level Networks
        if (networks.size > 0) {
            yaml += 'networks:\n';
            networks.forEach(nName => {
                const node = nodes.find(n => nodeNameMap.get(n.id) === nName);
                if (!node || node.type !== 'network') {
                    yaml += `  ${nName}:\n`;
                    return;
                }

                yaml += `  ${nName}:\n`;
                // Default to bridge if likely empty, but explicit is better
                if (node.config.driver) yaml += `    driver: ${node.config.driver}\n`;

                if (node.config.external) {
                    yaml += `    external: true\n`;
                } else { // Internal/Ipam ONLY if NOT external
                    if (node.config.internal) yaml += `    internal: true\n`;

                    if (node.config.ipam) {
                        yaml += `    ipam:\n`;
                        yaml += `      config:\n`;
                        yaml += `        - subnet: ${node.config.ipam.subnet}\n`;
                        if (node.config.ipam.gateway) yaml += `          gateway: ${node.config.ipam.gateway}\n`;
                    }
                }
            });
        }

        const projectName = this.projectData().name || 'docker-compose';
        const filename = projectName.endsWith('.yaml') || projectName.endsWith('.yml') ? projectName : `${projectName}.yaml`;
        this.downloadFile(filename, yaml);
    }

    openImportModal() {
        this.isImportModalOpen.set(true);
        this.isMenuOpen.set(false);
    }

    closeImportModal() {
        this.isImportModalOpen.set(false);
    }

    preventDefault(event: Event) {
        event.preventDefault();
        event.stopPropagation();
    }

    triggerFileInput(input: HTMLInputElement, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        // Reset value to allow selecting the same file again if needed
        input.value = '';
        input.click();
    }

    onFileDropped(event: DragEvent) {
        this.preventDefault(event);
        if (event.dataTransfer?.files.length) {
            this.readFile(event.dataTransfer.files[0]);
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        const dataStr = event.dataTransfer?.getData('application/json');
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            if (data.type === 'template-drop') {
                const { clientX, clientY } = event;
                const p = this.getCanvasPoint(clientX, clientY);
                this.addTemplateNode(data, p.x, p.y);
            }
        } catch (e) {
            console.error('Error parsing drop data', e);
        }
    }

    private addTemplateNode(template: any, x: number, y: number) {
        if (template.category === 'Stack' || (template.config && template.config.services)) {
            this.addStackTemplate(template.config, x, y);
            return;
        }

        const config = { ...template.config };
        const name = (template.name || 'Service').replace(/[^a-zA-Z0-9-]/g, '_');

        const serviceNodeId = crypto.randomUUID();
        const serviceNode: DockerNodeData = {
            id: serviceNodeId,
            type: 'service',
            label: name,
            x: x,
            y: y,
            inputs: [{ id: crypto.randomUUID(), type: 'dependency', dir: 'in', label: 'Dep In' }],
            outputs: [
                { id: crypto.randomUUID(), type: 'dependency', dir: 'out', label: 'Dep Out' },
                { id: crypto.randomUUID(), type: 'volume', dir: 'out', label: 'Vol Out' },
                { id: crypto.randomUUID(), type: 'network', dir: 'out', label: 'Net Out' }
            ],
            config: config
        };

        const newNodes: DockerNodeData[] = [serviceNode];
        const newConns: DockConnection[] = [];

        // Simple Auto-Creation of Volumes if specified in string format
        if (Array.isArray(config.volumes)) {
            const remainingVolumes: string[] = [];
            let volOffset = 0;

            config.volumes.forEach((vol: string) => {
                if (typeof vol === 'string') {
                    const parts = vol.split(':');
                    const source = parts[0];
                    const target = parts[1] || '';

                    // If source doesn't resemble a path, assume named volume
                    if (source && !source.includes('/') && !source.includes('.') && !source.includes('\\')) {
                        const volNodeId = crypto.randomUUID();
                        volOffset += 120;
                        const volNode: DockerNodeData = {
                            id: volNodeId,
                            type: 'volume',
                            label: source,
                            x: x + 300,
                            y: y + volOffset - 120, // Stack them
                            inputs: [{ id: crypto.randomUUID(), type: 'volume', dir: 'in', label: 'Mount' }],
                            outputs: [],
                            config: { driver: 'local' }
                        };
                        newNodes.push(volNode);

                        newConns.push({
                            id: crypto.randomUUID(),
                            sourceNodeId: serviceNodeId,
                            sourceSocketId: serviceNode.outputs.find(s => s.type === 'volume')!.id,
                            targetNodeId: volNodeId,
                            targetSocketId: volNode.inputs[0].id
                        });

                        if (!serviceNode.config.volumeMounts) serviceNode.config.volumeMounts = {};
                        serviceNode.config.volumeMounts[volNodeId] = target;
                    } else {
                        remainingVolumes.push(vol);
                    }
                } else {
                    remainingVolumes.push(vol);
                }
            });

            // Update config to only keep bind mounts (unmanaged)
            serviceNode.config.volumes = remainingVolumes;
        }

        this.nodes.update(curr => [...curr, ...newNodes]);
        this.connections.update(curr => [...curr, ...newConns]);
    }

    private addStackTemplate(data: any, startX: number, startY: number) {
        if (!data || !data.services) return;

        const newNodes: DockerNodeData[] = [];
        const newConnections: DockConnection[] = [];
        const serviceMap = new Map<string, string>(); // ServiceName -> NodeID

        let yOffset = startY;
        const xServices = startX;
        const xResources = startX + 400;

        let volY = startY;
        let netY = startY + 200; // rough start

        // 1. Create Service Nodes
        for (const [name, svc] of Object.entries(data.services) as [string, any][]) {
            const nodeId = crypto.randomUUID();
            serviceMap.set(name, nodeId);

            const config: any = {
                restart: svc.restart,
                container_name: svc.container_name,
                environment: svc.environment,
                ports: svc.ports,
                expose: svc.expose,
                volumes: [], // Bind mounts only
                volumeMounts: {} // Map VolumeID -> TargetPath
            };

            if (svc.build) {
                if (typeof svc.build === 'string') {
                    config.build = { context: svc.build };
                } else {
                    config.build = { ...svc.build };
                }
            } else {
                config.image = svc.image;
            }

            if (svc.deploy?.resources?.limits) {
                config.deploy = { resources: { limits: { ...svc.deploy.resources.limits } } };
            }

            if (svc.healthcheck) {
                config.healthcheck = { ...svc.healthcheck };
            }

            newNodes.push({
                id: nodeId, type: 'service', label: name, x: xServices, y: yOffset,
                inputs: [{ id: crypto.randomUUID(), type: 'dependency', dir: 'in', label: 'Dep In' }],
                outputs: [
                    { id: crypto.randomUUID(), type: 'dependency', dir: 'out', label: 'Dep Out' },
                    { id: crypto.randomUUID(), type: 'volume', dir: 'out', label: 'Vol Out' },
                    { id: crypto.randomUUID(), type: 'network', dir: 'out', label: 'Net Out' }
                ],
                config
            });

            yOffset += 180;
        }

        // Adjust Vol/Net Y start to avoid overlapping with services if resources are placed below? 
        // We place resources to the RIGHT (xResources).

        const volumeMap = new Map<string, string>(); // VolName -> NodeID

        if (data.volumes) {
            for (const [name, vol] of Object.entries(data.volumes) as [string, any][]) {
                const nodeId = crypto.randomUUID();
                volumeMap.set(name, nodeId);
                const volConfig = vol || {};

                newNodes.push({
                    id: nodeId, type: 'volume', label: name, x: xResources, y: volY,
                    inputs: [{ id: crypto.randomUUID(), type: 'volume', dir: 'in', label: 'Mount' }],
                    outputs: [],
                    config: {
                        driver: volConfig.driver,
                        external: volConfig.external,
                        driverOpts: volConfig.driver_opts,
                        name: volConfig.name
                    }
                });
                volY += 120;
            }
        }

        const networkMap = new Map<string, string>();
        if (data.networks) {
            // Start networks below volumes
            netY = Math.max(netY, volY);

            for (const [name, net] of Object.entries(data.networks) as [string, any][]) {
                const nodeId = crypto.randomUUID();
                networkMap.set(name, nodeId);
                const netConfig = net || {};
                const ipam = netConfig.ipam?.config?.[0];

                newNodes.push({
                    id: nodeId, type: 'network', label: name, x: xResources, y: netY,
                    inputs: [{ id: crypto.randomUUID(), type: 'network', dir: 'in', label: 'Member' }],
                    outputs: [],
                    config: {
                        driver: netConfig.driver,
                        external: netConfig.external?.name ? true : (netConfig.external || false),
                        internal: netConfig.internal,
                        ipam: ipam ? { subnet: ipam.subnet, gateway: ipam.gateway } : undefined
                    }
                });
                netY += 120;
            }
        }

        // 4. Connect Services
        for (const [name, svc] of Object.entries(data.services) as [string, any][]) {
            const sourceId = serviceMap.get(name)!;
            const sourceNode = newNodes.find(n => n.id === sourceId)!;

            // Depends On
            if (svc.depends_on) {
                const deps = Array.isArray(svc.depends_on) ? svc.depends_on : Object.keys(svc.depends_on);
                deps.forEach((depName: string) => {
                    const targetId = serviceMap.get(depName);
                    if (targetId) {
                        const targetNode = newNodes.find(n => n.id === targetId)!;
                        newConnections.push({
                            id: crypto.randomUUID(),
                            sourceNodeId: sourceId,
                            sourceSocketId: sourceNode.outputs.find(s => s.type === 'dependency')!.id,
                            targetNodeId: targetId,
                            targetSocketId: targetNode.inputs.find(s => s.type === 'dependency')!.id
                        });
                    }
                });
            }

            // Networks
            if (svc.networks) {
                const nets = Array.isArray(svc.networks) ? svc.networks : Object.keys(svc.networks);
                nets.forEach((netName: string) => {
                    const targetId = networkMap.get(netName);
                    if (targetId) {
                        const targetNode = newNodes.find(n => n.id === targetId)!;
                        newConnections.push({
                            id: crypto.randomUUID(),
                            sourceNodeId: sourceId,
                            sourceSocketId: sourceNode.outputs.find(s => s.type === 'network')!.id,
                            targetNodeId: targetId,
                            targetSocketId: targetNode.inputs.find(s => s.type === 'network')!.id
                        });
                    }
                });
            }

            // Volumes
            if (svc.volumes) {
                svc.volumes.forEach((volStr: string | any) => {
                    let source = '';
                    let target = '';

                    if (typeof volStr === 'string') {
                        const parts = volStr.split(':');
                        source = parts[0];
                        target = parts.length > 1 ? parts[1] : '';
                    } else {
                        source = volStr.source;
                        target = volStr.target;
                    }

                    const targetId = volumeMap.get(source);
                    if (targetId) {
                        const targetNode = newNodes.find(n => n.id === targetId)!;
                        newConnections.push({
                            id: crypto.randomUUID(),
                            sourceNodeId: sourceId,
                            sourceSocketId: sourceNode.outputs.find(s => s.type === 'volume')!.id,
                            targetNodeId: targetId,
                            targetSocketId: targetNode.inputs.find(s => s.type === 'volume')!.id
                        });

                        if (!sourceNode.config.volumeMounts) sourceNode.config.volumeMounts = {};
                        sourceNode.config.volumeMounts[targetId] = target;

                    } else {
                        if (!sourceNode.config.volumes) sourceNode.config.volumes = [];
                        sourceNode.config.volumes.push(volStr);
                    }
                });
            }
        }

        this.nodes.update(curr => [...curr, ...newNodes]);
        this.connections.update(curr => [...curr, ...newConnections]);
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.readFile(input.files[0]);
        }
    }

    private readFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            this.processYaml(content);
        };
        reader.readAsText(file);
    }

    private processYaml(content: string) {
        try {
            const data: any = yaml.load(content);
            if (!data || !data.services) {
                alert('Invalid docker-compose file: No services found');
                return;
            }

            const newNodes: DockerNodeData[] = [];
            const newConnections: DockConnection[] = [];
            const serviceMap = new Map<string, string>(); // ServiceName -> NodeID

            let yOffset = 100;
            const xServices = 400;
            const xResources = 800;

            // 1. Create Service Nodes
            for (const [name, svc] of Object.entries(data.services) as [string, any][]) {
                const nodeId = crypto.randomUUID();
                serviceMap.set(name, nodeId);

                const config: any = {
                    restart: svc.restart,
                    container_name: svc.container_name,
                    environment: svc.environment,
                    ports: svc.ports,
                    expose: svc.expose,
                    volumes: [], // Bind mounts only
                    volumeMounts: {} // Map VolumeID -> TargetPath
                };

                // Image vs Build
                if (svc.build) {
                    if (typeof svc.build === 'string') {
                        config.build = { context: svc.build };
                    } else {
                        config.build = { ...svc.build };
                    }
                } else {
                    config.image = svc.image;
                }

                // Deploy / Resources
                if (svc.deploy?.resources?.limits) {
                    config.deploy = { resources: { limits: { ...svc.deploy.resources.limits } } };
                }

                // Healthcheck
                if (svc.healthcheck) {
                    config.healthcheck = { ...svc.healthcheck };
                }

                newNodes.push({
                    id: nodeId, type: 'service', label: name, x: xServices, y: yOffset,
                    inputs: [{ id: crypto.randomUUID(), type: 'dependency', dir: 'in', label: 'Dep In' }],
                    outputs: [
                        { id: crypto.randomUUID(), type: 'dependency', dir: 'out', label: 'Dep Out' },
                        { id: crypto.randomUUID(), type: 'volume', dir: 'out', label: 'Vol Out' },
                        { id: crypto.randomUUID(), type: 'network', dir: 'out', label: 'Net Out' }
                    ],
                    config
                });

                yOffset += 180;
            }

            // 2. Create Volume Nodes & Connections
            let volY = 100;
            const volumeMap = new Map<string, string>(); // VolName -> NodeID

            if (data.volumes) {
                for (const [name, vol] of Object.entries(data.volumes) as [string, any][]) {
                    const nodeId = crypto.randomUUID();
                    volumeMap.set(name, nodeId);

                    // Safe handling if vol is null/undefined (typical in empty volume declaration)
                    const volConfig = vol || {};

                    newNodes.push({
                        id: nodeId, type: 'volume', label: name, x: xResources, y: volY,
                        inputs: [{ id: crypto.randomUUID(), type: 'volume', dir: 'in', label: 'Mount' }],
                        outputs: [],
                        config: {
                            driver: volConfig.driver,
                            external: volConfig.external,
                            driverOpts: volConfig.driver_opts,
                            name: volConfig.name
                        }
                    });
                    volY += 120;
                }
            }

            // 3. Create Network Nodes & Connections
            let netY = volY + 50;
            const networkMap = new Map<string, string>();

            if (data.networks) {
                for (const [name, net] of Object.entries(data.networks) as [string, any][]) {
                    const nodeId = crypto.randomUUID();
                    networkMap.set(name, nodeId);

                    const netConfig = net || {};
                    const ipam = netConfig.ipam?.config?.[0]; // Grab first config if exists

                    newNodes.push({
                        id: nodeId, type: 'network', label: name, x: xResources, y: netY,
                        inputs: [{ id: crypto.randomUUID(), type: 'network', dir: 'in', label: 'Member' }],
                        outputs: [],
                        config: {
                            driver: netConfig.driver,
                            external: netConfig.external?.name ? true : (netConfig.external || false), // Handle object or bool
                            internal: netConfig.internal,
                            ipam: ipam ? { subnet: ipam.subnet, gateway: ipam.gateway } : undefined
                        }
                    });
                    netY += 120;
                }
            }

            // 4. Connect Services
            for (const [name, svc] of Object.entries(data.services) as [string, any][]) {
                const sourceId = serviceMap.get(name)!;
                const sourceNode = newNodes.find(n => n.id === sourceId)!;

                // Depends On
                if (svc.depends_on) {
                    const deps = Array.isArray(svc.depends_on) ? svc.depends_on : Object.keys(svc.depends_on);
                    deps.forEach((depName: string) => {
                        const targetId = serviceMap.get(depName);
                        if (targetId) {
                            const targetNode = newNodes.find(n => n.id === targetId)!;
                            newConnections.push({
                                id: crypto.randomUUID(),
                                sourceNodeId: sourceId,
                                sourceSocketId: sourceNode.outputs.find(s => s.type === 'dependency')!.id,
                                targetNodeId: targetId,
                                targetSocketId: targetNode.inputs.find(s => s.type === 'dependency')!.id
                            });
                        }
                    });
                }

                // Networks
                if (svc.networks) {
                    const nets = Array.isArray(svc.networks) ? svc.networks : Object.keys(svc.networks);
                    nets.forEach((netName: string) => {
                        const targetId = networkMap.get(netName);
                        if (targetId) {
                            const targetNode = newNodes.find(n => n.id === targetId)!;
                            newConnections.push({
                                id: crypto.randomUUID(),
                                sourceNodeId: sourceId,
                                sourceSocketId: sourceNode.outputs.find(s => s.type === 'network')!.id,
                                targetNodeId: targetId,
                                targetSocketId: targetNode.inputs.find(s => s.type === 'network')!.id
                            });
                        }
                    });
                }

                // Volumes
                if (svc.volumes) {
                    svc.volumes.forEach((volStr: string | any) => {
                        // Parse "source:target:mode" or object
                        let source = '';
                        let target = '';

                        if (typeof volStr === 'string') {
                            const parts = volStr.split(':');
                            source = parts[0];
                            target = parts.length > 1 ? parts[1] : '';
                        } else {
                            source = volStr.source;
                            target = volStr.target;
                        }

                        const targetId = volumeMap.get(source);
                        if (targetId) {
                            // It's a managed volume -> Connection
                            const targetNode = newNodes.find(n => n.id === targetId)!;
                            newConnections.push({
                                id: crypto.randomUUID(),
                                sourceNodeId: sourceId,
                                sourceSocketId: sourceNode.outputs.find(s => s.type === 'volume')!.id,
                                targetNodeId: targetId,
                                targetSocketId: targetNode.inputs.find(s => s.type === 'volume')!.id
                            });

                            // Save mount path
                            if (!sourceNode.config.volumeMounts) sourceNode.config.volumeMounts = {};
                            sourceNode.config.volumeMounts[targetId] = target;

                        } else {
                            // Bind mount -> Add to config.volumes
                            if (!sourceNode.config.volumes) sourceNode.config.volumes = [];
                            sourceNode.config.volumes.push(volStr);
                        }
                    });
                }
            }

            // Apply new state
            this.nodes.set(newNodes);
            this.connections.set(newConnections);
            this.closeImportModal();

        } catch (e) {
            console.error(e);
            alert('Error parsing YAML file. Please check the console.');
        }
    }

    private downloadFile(filename: string, content: string) {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/yaml' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
    }
}
