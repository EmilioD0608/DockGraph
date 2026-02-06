import { Component, signal, HostListener, ViewChild, effect, computed, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Download, Upload, Plus, Save, Network, Undo, Redo } from 'lucide-angular';
import { Router } from '@angular/router';
import * as yaml from 'js-yaml';

import { CanvasComponent } from '../../components/canvas/canvas';
import { ContextMenuComponent } from '../../components/context-menu/context-menu.component';
import { NodeEditorComponent } from '../../components/node-editor/node-editor.component';
import { LeftPanelComponent } from '../../components/left-panel/left-panel.component';
import { DockerNodeData, DockConnection, Socket } from '../../models/docker-node';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { YamlService } from '../../services/yaml.service';
import { ValidationService, ValidationIssue } from '../../services/validation.service';
import { ProjectsService, Project } from '../../services/projects.service';
import { AuthService } from '../../services/auth.service';
import { EditorStore } from '../../store/editor.store';
import { ValidationDialogComponent } from '../../components/validation-dialog/validation-dialog.component';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, CanvasComponent, ContextMenuComponent, NodeEditorComponent, LeftPanelComponent, ConfirmDialogComponent, ValidationDialogComponent],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.css'
})
export class EditorComponent implements OnInit {
    @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;

    readonly store = inject(EditorStore);
    readonly icons = { download: Download, upload: Upload, plus: Plus, save: Save, network: Network, undo: Undo, redo: Redo };

    isMenuOpen = signal(false);
    isImportModalOpen = signal(false);

    // Project System UI State
    isProjectModalOpen = signal(false);
    isNewProjectWarningOpen = signal(false);

    // Validation State
    validationIssues = signal<ValidationIssue[]>([]);
    isValidationOpen = signal(false);

    // Context Menu State (UI specific)
    contextMenu = signal<{ x: number, y: number, visible: boolean, view: 'main' | 'add-node' | 'node-context', data?: any }>({
        x: 0, y: 0, visible: false, view: 'main'
    });

    // Auth State
    userProjects = signal<Project[]>([]);

    constructor(
        private yamlService: YamlService,
        private validationService: ValidationService,
        private projectsService: ProjectsService,
        public authService: AuthService,
        private router: Router
    ) {
        // Watch user changes to load projects
        effect(() => {
            const user = this.authService.currentUser();
            if (user) {
                console.log('Cargando proyectos para:', user.email);
                this.loadUserProjects();
            } else {
                this.userProjects.set([]);
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        // If no project name is set, show the creation modal at start
        if (!this.store.project().name) {
            this.isProjectModalOpen.set(true);
        }
    }

    loadUserProjects() {
        this.projectsService.findAll().subscribe({
            next: (data) => {
                this.userProjects.set(data);
            },
            error: (e) => console.error('Error en findAll projects:', e)
        });
    }

    openLoginModal() {
        this.router.navigate(['/login']);
    }

    handleProjectSelect(p: Project) {
        // Transform backend format to store format
        const nodes = p.data.nodes || [];
        const connections = p.data.connections || [];
        const meta = {
            name: p.name,
            tech: 'docker-compose',
            id: p.id,
            uuid: p.uuid
        };

        this.store.loadProject({ nodes, connections, meta });
    }

    // Project System Methods

    saveProject() {
        if (!this.authService.currentUser()) {
            this.openLoginModal();
            return;
        }

        const currentData = {
            nodes: this.store.nodes(),
            connections: this.store.connections()
        };

        const projectPayload = {
            name: this.store.project().name || 'Untitled Project',
            data: currentData
        };

        const projectId = this.store.project().id;

        if (projectId) {
            this.projectsService.update(projectId, projectPayload).subscribe({
                next: (res) => {
                    alert('Project saved successfully!');
                    this.store.updateProjectMeta({ ...res });
                    this.loadUserProjects(); // Sync sidebar
                },
                error: (err) => {
                    console.error(err);
                    if (err.status === 403) {
                        if (confirm('No tienes permiso para editar este proyecto (pertenece a otro usuario). ¿Quieres guardar una copia?')) {
                            // Create as new
                            this.projectsService.create(projectPayload).subscribe({
                                next: (res) => {
                                    alert('Project cloned successfully!');
                                    this.store.updateProjectMeta({ id: res.id, uuid: res.uuid });
                                    this.loadUserProjects();
                                },
                                error: (e) => alert('Error creating clone.')
                            });
                        }
                    } else {
                        alert('Error saving project.');
                    }
                }
            });
        } else {
            this.projectsService.create(projectPayload).subscribe({
                next: (res) => {
                    alert('Project created successfully!');
                    this.store.updateProjectMeta({ id: res.id, uuid: res.uuid });
                    this.loadUserProjects(); // Sync sidebar
                },
                error: (err) => {
                    console.error(err);
                    alert('Error creating project.');
                }
            });
        }
    }
    openNewProjectWarning() {
        this.isNewProjectWarningOpen.set(true);
    }

    cancelNewProject() {
        this.isNewProjectWarningOpen.set(false);
    }

    updateProjectName(name: string) {
        this.store.updateProjectMeta({ name });
    }

    setProjectTech(tech: string) {
        this.store.updateProjectMeta({ tech });
    }


    confirmNewProject() {
        this.isNewProjectWarningOpen.set(false);
        // Reset form
        this.store.clearProject();
        this.isProjectModalOpen.set(true);
    }

    createProject() {
        if (!this.store.project().name) return;
        this.isProjectModalOpen.set(false);
    }


    toggleMenu() {
        this.isMenuOpen.update(value => !value);
    }

    toggleDarkMode() {
        this.store.toggleDarkMode();
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
        if (this.contextMenu().visible) {
            this.closeContextMenu();
        }

        const target = event.target as Element;
        if (target) {
            const insidePanel = target.closest('app-left-panel');
            if (!insidePanel && this.store.selectedConnectionId()) {
                this.store.selectConnection(null);
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
                    selectedIds.forEach((id: string) => nodesToDelete.add(id));
                } else {
                    nodesToDelete.add(data.nodeId);
                }

                this.store.deleteNodes(nodesToDelete);
                this.canvasRef.selectedNodeIds.set(new Set());
            }
        }
        else if (action === 'edit-node') {
            // Set editing ID in store
            this.store.setEditingNode(data?.nodeId);
        }
    }

    updateNode(updatedNode: DockerNodeData) {
        this.store.updateNode(updatedNode, true);
    }

    onCanvasNodeMove(updatedNode: DockerNodeData) {
        this.store.updateNode(updatedNode, false);
    }

    onNodeDragStart() {
        this.store.saveToHistory();
    }

    undo() {
        this.store.undo();
    }

    redo() {
        this.store.redo();
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        // Ignorar si estamos escribiendo en un input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
                this.redo();
            } else {
                this.undo();
            }
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault();
            this.redo();
        }
    }

    handleConnectionCreate(conn: DockConnection) {
        this.store.addConnection(conn);
    }

    // Left Panel Handlers
    handlePanelConnectionCreate(event: { sourceId: string, targetId: string }) {
        const sourceNode = this.store.nodes().find(n => n.id === event.sourceId);
        const targetNode = this.store.nodes().find(n => n.id === event.targetId);

        if (!sourceNode || !targetNode) return;

        // Use ValidationService to determine socket types
        const socketTypes = this.validationService.getConnectionSocketTypes(sourceNode.type, targetNode.type);

        if (!socketTypes) {
            alert(`Conexión inválida: ${sourceNode.type} no puede conectarse a ${targetNode.type}.`);
            return;
        }

        const sourceSocketId = sourceNode.outputs.find(s => s.type === socketTypes.sourceSocketType)?.id;
        const targetSocketId = targetNode.inputs.find(s => s.type === socketTypes.targetSocketType)?.id;

        if (!sourceSocketId || !targetSocketId) {
            alert('No se encontraron sockets compatibles en los nodos.');
            return;
        }

        // Check if connection already exists
        const exists = this.store.connections().some(c =>
            c.sourceNodeId === event.sourceId &&
            c.targetNodeId === event.targetId &&
            c.sourceSocketId === sourceSocketId &&
            c.targetSocketId === targetSocketId
        );

        if (exists) {
            alert('La relación ya existe.');
            return;
        }

        const newConn: DockConnection = {
            id: crypto.randomUUID(),
            sourceNodeId: event.sourceId,
            targetNodeId: event.targetId,
            sourceSocketId: sourceSocketId,
            targetSocketId: targetSocketId
        };
        this.store.addConnection(newConn);
    }

    handlePanelConnectionUpdate(updatedConn: DockConnection) {
        this.store.updateConnection(updatedConn);
    }

    handlePanelConnectionDelete(connId: string) {
        this.store.deleteConnection(connId);
    }

    handlePanelConnectionSelect(connId: string) {
        this.store.selectConnection(connId);
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
        this.store.addNode(newNode);
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
        this.store.addNode(newNode);
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
        this.store.addNode(newNode);
    }

    closeEditor() {
        this.store.setEditingNode(null);
    }

    saveNodeEditor(updatedNode: DockerNodeData) {
        const validationError = this.validateNode(updatedNode);
        if (validationError) {
            alert(`Validation Error: ${validationError}`);
            return;
        }
        this.store.updateNode(updatedNode);
        this.closeEditor();
    }

    private validateNode(node: DockerNodeData): string | null {
        if (node.type === 'service') {
            if (node.config.ports) {
                for (const p of node.config.ports) {
                    if (!this.validationService.validatePort(p)) return `Invalid port format: ${p}`;
                }
            }
            if (node.config.container_name && !this.validationService.validateContainerName(node.config.container_name)) {
                return 'Invalid container name';
            }
        }
        return null;
    }

    autoLayout() {
        this.store.autoLayout();
    }

    exportYaml() {
        this.yamlService.exportYaml(this.store.nodes(), this.store.connections(), this.store.project().name);
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
        input.value = '';
        input.click();
    }

    onFileDropped(event: DragEvent) {
        this.preventDefault(event);
        if (event.dataTransfer?.files.length) {
            this.readFile(event.dataTransfer.files[0]);
        }
    }

    // Helper to read file separate from drop event to reuse with input
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.readFile(input.files[0]);
        }
    }

    readFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            try {
                const { nodes, connections, warnings } = this.yamlService.processYaml(content);

                // Load into Store
                // We keep current meta if we want, or reset it? Usually import implies current project data
                // Let's assume we keep current name/id but replace content
                this.store.loadProject({
                    nodes,
                    connections,
                    meta: this.store.project()
                });

                this.closeImportModal();

                // Optional: Auto Layout after import
                this.store.autoLayout();

                // Show warnings using ValidationDialog
                if (warnings && warnings.length > 0) {
                    const issues = warnings.map(w => ({
                        type: 'warning' as const,
                        message: w,
                        nodeId: 'system'
                    }));
                    this.validationIssues.set(issues);
                    this.isValidationOpen.set(true);
                }

            } catch (err: any) {
                alert('Error parsing YAML: ' + err.message);
            }
        };
        reader.readAsText(file);
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

        newNodes.forEach(n => this.store.addNode(n));
        newConns.forEach(c => this.store.addConnection(c));
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
                stdin_open: !!svc.stdin_open,
                tty: !!svc.tty,
                volumes: [], // Bind mounts only
                volumeMounts: {}, // Map VolumeID -> TargetPath
                depends_on: {} // Metada storage
            };

            // Preserve depends_on conditions
            if (svc.depends_on && !Array.isArray(svc.depends_on)) {
                config.depends_on = svc.depends_on;
            }

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

        // Batch update store
        newNodes.forEach(n => this.store.addNode(n));
        newConnections.forEach(c => this.store.addConnection(c));
    }

    validateAndExport() {
        const issues = this.validationService.validateGraph(this.store.nodes(), this.store.connections());

        // Always show dialog so user knows validation happened
        this.validationIssues.set(issues);
        this.isValidationOpen.set(true);
    }

    onConfirmExport() {
        this.yamlService.exportYaml(
            this.store.nodes(),
            this.store.connections(),
            this.store.project().name || 'dockgraph-project'
        );
        this.isValidationOpen.set(false);
    }

}
