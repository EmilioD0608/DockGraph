import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { withUndoRedo } from './features/undo-redo.feature';
import { DockerNodeData, DockConnection } from '../models/docker-node';
import { computed, effect, inject } from '@angular/core';
import { LayoutService } from '../services/layout.service';

import { RepoStrategy } from '../services/projects.service';

export interface ProjectMetaData {
    name: string;
    tech: string;
    id?: number;
    uuid?: string;

    // Git Ops
    repoStrategy?: RepoStrategy;
    repositoryUrl?: string;
    branch?: string;
    gitCredentialId?: number;
}

export interface EditorState {
    nodes: DockerNodeData[];
    connections: DockConnection[];
    project: ProjectMetaData;
    selectedConnectionId: string | null;
    editingNodeId: string | null; // Guardamos ID en vez de objeto completo para evitar redundancia
    isDarkMode: boolean;
}

const initialState: EditorState = {
    nodes: [],
    connections: [],
    project: { name: '', tech: 'docker-compose' },
    selectedConnectionId: null,
    editingNodeId: null,
    isDarkMode: true
};

export const EditorStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(({ nodes, editingNodeId, connections }) => ({
        // Computed: Connected volumes for the currently editing node
        connectedVolumes: computed(() => {
            const currentId = editingNodeId();
            if (!currentId) return [];

            const node = nodes().find(n => n.id === currentId);
            if (!node || node.type !== 'service') return [];

            return connections()
                .filter(c => c.sourceNodeId === node.id)
                .map(c => nodes().find(n => n.id === c.targetNodeId))
                .filter((n): n is DockerNodeData => !!n && n.type === 'volume')
                .map(v => ({ id: v.id, label: v.label }));
        }),
        editingNode: computed(() => {
            const id = editingNodeId();
            return id ? nodes().find(n => n.id === id) || null : null;
        })
    })),
    // ... imports
    withUndoRedo({ keys: ['nodes', 'connections', 'project'] }),
    withMethods((store) => {
        const layoutService = inject(LayoutService);

        return {
            loadProject(project: { nodes: DockerNodeData[], connections: DockConnection[], meta: ProjectMetaData }) {
                store.saveToHistory();
                patchState(store, {
                    nodes: project.nodes,
                    connections: project.connections,
                    project: project.meta
                });
            },

            // Nodes
            addNode(node: DockerNodeData) {
                store.saveToHistory();
                patchState(store, (state) => ({ nodes: [...state.nodes, node] }));
            },
            updateNode(updatedNode: DockerNodeData, saveHistory = true) {
                if (saveHistory) store.saveToHistory();
                patchState(store, (state) => ({
                    nodes: state.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
                }));
            },
            deleteNodes(nodeIds: Set<string>) {
                store.saveToHistory();
                patchState(store, (state) => {
                    const newNodes = state.nodes.filter(n => !nodeIds.has(n.id));
                    // Cascade delete connections
                    const newConnections = state.connections.filter(c =>
                        !nodeIds.has(c.sourceNodeId) && !nodeIds.has(c.targetNodeId)
                    );

                    // Clear selection if deleted
                    let newEditingId = state.editingNodeId;
                    if (newEditingId && nodeIds.has(newEditingId)) newEditingId = null;

                    return { nodes: newNodes, connections: newConnections, editingNodeId: newEditingId };
                });
            },

            // Connections
            addConnection(connection: DockConnection) {
                store.saveToHistory();
                patchState(store, (state) => ({ connections: [...state.connections, connection] }));
            },
            updateConnection(updatedConn: DockConnection) {
                store.saveToHistory();
                patchState(store, (state) => ({
                    connections: state.connections.map(c => c.id === updatedConn.id ? updatedConn : c)
                }));
            },
            deleteConnection(connectionId: string) {
                store.saveToHistory();
                patchState(store, (state) => ({
                    connections: state.connections.filter(c => c.id !== connectionId),
                    selectedConnectionId: state.selectedConnectionId === connectionId ? null : state.selectedConnectionId
                }));
            },
            selectConnection(id: string | null) {
                // Selection is UI state, usuall no undo/redo needed unless requested
                patchState(store, { selectedConnectionId: id });
            },

            // Editor UI
            setEditingNode(nodeId: string | null) {
                patchState(store, { editingNodeId: nodeId });
            },
            toggleDarkMode() {
                patchState(store, (state) => ({ isDarkMode: !state.isDarkMode }));
            },

            // Project
            updateProjectMeta(meta: Partial<ProjectMetaData>) {
                store.saveToHistory(); // Meta updates are important
                patchState(store, (state) => ({
                    project: { ...state.project, ...meta }
                }));
            },
            clearProject() {
                store.saveToHistory();
                patchState(store, {
                    nodes: [],
                    connections: [],
                    selectedConnectionId: null,
                    editingNodeId: null,
                    project: { name: '', tech: 'docker-compose' }
                });
            },

            // Auto Layout
            autoLayout() {
                store.saveToHistory();
                const layouted = layoutService.applyLayout(store.nodes(), store.connections());
                patchState(store, { nodes: layouted });
            }
        };
    }),
    withHooks({
        onInit(store) {
            // Load from LocalStorage
            const savedNodes = localStorage.getItem('dockgraph-nodes');
            const savedConns = localStorage.getItem('dockgraph-connections');
            const savedProject = localStorage.getItem('dockgraph-project');
            const savedTheme = localStorage.getItem('dockgraph-theme'); // new

            patchState(store, {
                nodes: savedNodes ? JSON.parse(savedNodes) : [],
                connections: savedConns ? JSON.parse(savedConns) : [],
                project: savedProject ? JSON.parse(savedProject) : { name: '', tech: 'docker-compose' },
                isDarkMode: savedTheme ? JSON.parse(savedTheme) : true
            });

            // Setup Auto-Save Effect
            effect(() => {
                const state = {
                    nodes: store.nodes(),
                    connections: store.connections(),
                    project: store.project(),
                    isDarkMode: store.isDarkMode()
                };

                localStorage.setItem('dockgraph-nodes', JSON.stringify(state.nodes));
                localStorage.setItem('dockgraph-connections', JSON.stringify(state.connections));
                localStorage.setItem('dockgraph-project', JSON.stringify(state.project));
                localStorage.setItem('dockgraph-theme', JSON.stringify(state.isDarkMode));
            });
        }
    })
);
