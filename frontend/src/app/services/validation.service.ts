import { Injectable } from '@angular/core';
import { DockerNodeData, DockConnection } from '../models/docker-node';

export interface ValidationIssue {
    type: 'error' | 'warning';
    nodeId?: string; // If specific to a node
    message: string;
    description?: string; // Helper text
}

@Injectable({
    providedIn: 'root'
})
export class ValidationService {

    constructor() { }

    /**
     * Performs a full semantic analysis of the graph.
     */
    validateGraph(nodes: DockerNodeData[], connections: DockConnection[]): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        // 1. Check Duplicate Names (Labels)
        const nameMap = new Map<string, string>(); // name -> id
        nodes.forEach(n => {
            const label = n.label.trim();
            if (!label) {
                issues.push({ type: 'error', nodeId: n.id, message: `Node has no name.` });
            } else if (nameMap.has(label)) {
                issues.push({ type: 'error', nodeId: n.id, message: `Duplicate node name: "${label}"` });
                issues.push({ type: 'error', nodeId: nameMap.get(label), message: `Duplicate node name: "${label}"` });
            } else {
                nameMap.set(label, n.id);
            }
        });

        // 2. Check Service Constraints
        nodes.filter(n => n.type === 'service').forEach(svc => {
            // Must have image OR build
            const hasImage = !!svc.config.image;
            const hasBuild = !!svc.config.build;

            if (!hasImage && !hasBuild) {
                issues.push({
                    type: 'error',
                    nodeId: svc.id,
                    message: `Service "${svc.label}" has no Image and no Build context.`
                });
            }

            // Check Duplicate Host Ports
            if (svc.config.ports) {
                // This logic handles local duplicates within the service. 
                const hostPorts = new Set<string>();
                svc.config.ports.forEach(p => {
                    if (p.includes(':')) {
                        const hostPort = p.split(':')[0];
                        if (hostPorts.has(hostPort)) {
                            issues.push({
                                type: 'error',
                                nodeId: svc.id,
                                message: `Duplicate host port ${hostPort} in service "${svc.label}"`
                            });
                        }
                        hostPorts.add(hostPort);
                    }
                });
            }
        });

        // 3. Global Port Collisions
        // Two DIFFERENT services cannot bind the same host port
        const globalHostPorts = new Map<string, string>(); // port -> serviceLabel
        nodes.filter(n => n.type === 'service').forEach(svc => {
            if (svc.config.ports) {
                svc.config.ports.forEach(p => {
                    const parts = p.split(':');
                    if (parts.length > 1) {
                        const hostPort = parts[0];
                        if (globalHostPorts.has(hostPort)) {
                            const otherSvc = globalHostPorts.get(hostPort);
                            issues.push({
                                type: 'error',
                                nodeId: svc.id,
                                message: `Port Collision: Port ${hostPort} is already used by service "${otherSvc}"`
                            });
                        } else {
                            globalHostPorts.set(hostPort, svc.label);
                        }
                    }
                });
            }
        });

        // 4. Orphaned Nodes (Warning)
        // A node with no connections might be intentional, but worth flagging if it's not "external"
        nodes.forEach(n => {
            const isConnected = connections.some(c => c.sourceNodeId === n.id || c.targetNodeId === n.id);
            if (!isConnected) {
                // If it's a network/volume marked external, maybe it's fine.
                // But generally a chart has connections.
                issues.push({
                    type: 'warning',
                    nodeId: n.id,
                    message: `Node "${n.label}" is isolated (no connections).`
                });
            }
        });

        // 5. Volume/Network Config checks
        nodes.filter(n => n.type === 'volume').forEach(vol => {
            if (!vol.config.external && (!vol.config.driver || vol.config.driver === 'local') && !vol.config.driverOpts) {
                // Probably fine, standard local volume.
            }
        });

        return issues;
    }

    /**
     * Validates a port mapping string (e.g., "80:80").
     */
    validatePort(portStr: string): boolean {
        if (!portStr) return false;
        const portRegex = /^(((\d{1,3}\.){3}\d{1,3}:)?\d+(-\d+)?:)?\d+(-\d+)?(\/(tcp|udp|sctp))?$/;
        return portRegex.test(portStr);
    }

    /**
     * Validates a container name.
     */
    validateContainerName(name: string): boolean {
        if (!name) return true;
        const nameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;
        return nameRegex.test(name);
    }

    /**
     * Validates if a volume string is valid.
     */
    validateVolume(volStr: string): boolean {
        return !!volStr && volStr.length > 0;
    }

    validateImage(image: string): boolean {
        return !!image && image.length > 0;
    }

    /**
     * Validates if a connection between two node types is semantically valid for Docker Compose.
     * Connection Matrix:
     *   Service -> Service (Dependency): ✅
     *   Service -> Volume (Mount): ✅
     *   Service -> Network (Member): ✅
     *   Volume/Network -> Any: ❌ (passive resources)
     */
    validateConnection(sourceType: string, targetType: string): boolean {
        // Only services can be the SOURCE of a connection
        if (sourceType !== 'service') {
            return false;
        }

        // Services can connect to services, volumes, or networks
        const validTargets = ['service', 'volume', 'network'];
        return validTargets.includes(targetType);
    }

    /**
     * Determines the appropriate socket types for a connection between two node types.
     * Returns null if the connection is invalid.
     */
    getConnectionSocketTypes(sourceType: string, targetType: string): { sourceSocketType: string, targetSocketType: string } | null {
        if (!this.validateConnection(sourceType, targetType)) {
            return null;
        }

        // Determine socket type based on target
        if (targetType === 'service') {
            return { sourceSocketType: 'dependency', targetSocketType: 'dependency' };
        } else if (targetType === 'volume') {
            return { sourceSocketType: 'volume', targetSocketType: 'volume' };
        } else if (targetType === 'network') {
            return { sourceSocketType: 'network', targetSocketType: 'network' };
        }

        return null;
    }
}
