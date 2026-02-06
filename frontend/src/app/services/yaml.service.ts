import { Injectable } from '@angular/core';
import * as yaml from 'js-yaml';
import { DockerNodeData, DockConnection } from '../models/docker-node';
import { ComposeSpec, ServiceSpec, VolumeSpec, NetworkSpec, HealthcheckSpec } from '../models/docker-compose';

@Injectable({
    providedIn: 'root'
})
export class YamlService {

    constructor() { }

    /**
     * Generates a Docker Compose YAML string from the current nodes and connections.
     */
    exportYaml(nodes: DockerNodeData[], connections: DockConnection[], projectName: string = 'docker-compose'): void {
        const yamlContent = this.generateYamlContent(nodes, connections);
        const filename = projectName.endsWith('.yaml') || projectName.endsWith('.yml') ? projectName : `${projectName}.yaml`;
        this.downloadFile(filename, yamlContent);
    }

    /**
     * Internal method to generate the YAML string.
     */
    private generateYamlContent(nodes: DockerNodeData[], connections: DockConnection[]): string {
        const nodeNameMap = new Map<string, string>();
        const usedNames = new Set<string>();

        // Helper to generate unique name
        const getUniqueName = (baseName: string) => {
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

        nodes.forEach(node => {
            const safeName = getUniqueName(node.label);
            nodeNameMap.set(node.id, safeName);
        });

        const compose: ComposeSpec = {
            version: '3.8',
            services: {},
            volumes: {},
            networks: {}
        };

        // Populate Structures
        nodes.forEach(node => {
            const name = nodeNameMap.get(node.id)!;

            if (node.type === 'service') {
                const svc: ServiceSpec = {
                    restart: (node.config.restart as any) || 'no',
                };

                // Image / Build
                if (node.config.build) {
                    svc.build = typeof node.config.build === 'string' ? node.config.build : { ...node.config.build };
                } else {
                    svc.image = node.config.image || 'nginx:latest';
                }

                if (node.config.container_name) svc.container_name = node.config.container_name;

                // Ports
                if (node.config.ports?.length) svc.ports = [...node.config.ports];
                if (node.config.expose?.length) svc.expose = [...node.config.expose];

                // Environment
                if (node.config.environment && Object.keys(node.config.environment).length > 0) {
                    svc.environment = { ...node.config.environment };
                }

                // Command
                if (node.config.command) svc.command = node.config.command;

                // Resources
                if (node.config.deploy?.resources?.limits?.cpus || node.config.deploy?.resources?.limits?.memory) {
                    svc.deploy = {
                        resources: {
                            limits: {
                                cpus: node.config.deploy.resources.limits.cpus,
                                memory: node.config.deploy.resources.limits.memory
                            }
                        }
                    };
                }

                // Healthcheck
                if (node.config.healthcheck) {
                    svc.healthcheck = { ...node.config.healthcheck } as HealthcheckSpec;
                    // Format test array/string if needed
                }

                if (node.config.stdin_open) svc.stdin_open = true;
                if (node.config.tty) svc.tty = true;

                compose.services![name] = svc;

            } else if (node.type === 'volume') {
                const vol: VolumeSpec = {};
                if (node.config.driver && node.config.driver !== 'local') vol.driver = node.config.driver;
                if (node.config.external) {
                    vol.external = true;
                    if (node.config.name) vol.name = node.config.name;
                } else if (node.config.driverOpts && Object.keys(node.config.driverOpts).length > 0) {
                    vol.driver_opts = node.config.driverOpts;
                }
                compose.volumes![name] = vol;

            } else if (node.type === 'network') {
                const net: NetworkSpec = {};
                if (node.config.driver) net.driver = node.config.driver;
                if (node.config.external) {
                    net.external = true;
                } else {
                    if (node.config.internal) net.internal = true;
                    if (node.config.ipam?.subnet) {
                        net.ipam = {
                            config: [{ subnet: node.config.ipam.subnet, gateway: node.config.ipam.gateway }]
                        };
                    }
                }
                compose.networks![name] = net;
            }
        });

        // Loop Connections
        connections.forEach(conn => {
            const sourceName = nodeNameMap.get(conn.sourceNodeId);
            const targetName = nodeNameMap.get(conn.targetNodeId);
            const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = nodes.find(n => n.id === conn.targetNodeId);

            if (!sourceName || !targetName || !sourceNode || !targetNode) return;
            const svc = compose.services![sourceName];
            if (!svc) return;

            // Service -> Service (depends_on)
            if (targetNode.type === 'service') {
                if (!svc.depends_on) svc.depends_on = {};
                // If it is an array type transform to object or stick to one convention. 
                // We'll use Object format for conditions support
                if (Array.isArray(svc.depends_on)) {
                    // convert to object
                    const prev = svc.depends_on;
                    svc.depends_on = {};
                    prev.forEach(d => (svc.depends_on as any)[d] = { condition: 'service_started' });
                }

                (svc.depends_on as any)[targetName] = { condition: 'service_started' };
            }

            // Service -> Volume
            if (targetNode.type === 'volume') {
                if (!svc.volumes) svc.volumes = [];
                const mountPath = sourceNode.config.volumeMounts?.[targetNode.id] || '/app/data';
                // Check duplicate
                const entry = `${targetName}:${mountPath}`;
                if (!svc.volumes.includes(entry)) svc.volumes.push(entry);
            }

            // Service -> Network
            if (targetNode.type === 'network') {
                if (!svc.networks) svc.networks = [];
                // Normalize to array of strings for simplicity in this MVP
                if (Array.isArray(svc.networks)) {
                    if (!svc.networks.includes(targetName)) svc.networks.push(targetName);
                }
            }
        });

        // Cleanup empty sections
        if (Object.keys(compose.volumes!).length === 0) delete compose.volumes;
        if (Object.keys(compose.networks!).length === 0) delete compose.networks;

        // Dump with Custom Sorting
        return yaml.dump(compose, {
            lineWidth: -1,
            noRefs: true,
            sortKeys: (a, b) => {
                const order = ['version', 'services', 'networks', 'volumes',
                    'image', 'build', 'container_name', 'ports', 'environment', 'volumes', 'networks', 'depends_on'];
                const ia = order.indexOf(a);
                const ib = order.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b);
            }
        });
    }

    /**
     * Parses a YAML string and returns the nodes and connections configuration.
     */
    processYaml(content: string): { nodes: DockerNodeData[], connections: DockConnection[], warnings: string[] } {
        const warnings: string[] = [];
        try {
            const data: any = yaml.load(content);
            if (!data || !data.services) {
                throw new Error('Invalid docker-compose file: No services found');
            }

            const newNodes: DockerNodeData[] = [];
            const newConnections: DockConnection[] = [];
            const serviceMap = new Map<string, string>();

            const xServices = 400;
            const xResources = 800;

            const knownKeys = ['restart', 'container_name', 'environment', 'ports', 'expose', 'volumes', 'command', 'build', 'image', 'deploy', 'healthcheck', 'stdin_open', 'tty', 'depends_on', 'networks', 'labels', 'env_file', 'entrypoint', 'working_dir', 'user', 'privileged'];

            // 1. Services
            let yOffset = 100;
            for (const [name, svc] of Object.entries(data.services) as [string, any][]) {
                const nodeId = crypto.randomUUID();
                serviceMap.set(name, nodeId);

                const config: any = {
                    restart: svc.restart,
                    container_name: svc.container_name,
                    environment: svc.environment,
                    ports: svc.ports,
                    expose: svc.expose,
                    volumes: [],
                    volumeMounts: {},
                    command: svc.command,
                    labels: svc.labels,
                    env_file: svc.env_file,
                    entrypoint: svc.entrypoint,
                    working_dir: svc.working_dir,
                    user: svc.user
                };

                // Check for unknown keys and preserve them
                Object.keys(svc).forEach(key => {
                    if (!knownKeys.includes(key) && !['volumes', 'networks', 'depends_on'].includes(key)) {
                        // We exclude relation keys because they are handled separately
                        warnings.push(`Service '${name}': Property '${key}' preserved but not visualized.`);
                        config[key] = svc[key];
                    }
                });

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

                if (svc.stdin_open) config.stdin_open = true;
                if (svc.tty) config.tty = true;
                if (svc.privileged) config.privileged = true;

                if (svc.depends_on && !Array.isArray(svc.depends_on)) {
                    config.depends_on = svc.depends_on;
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

            // 2. Volumes
            let volY = 100;
            const volumeMap = new Map<string, string>();

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

            // 3. Networks
            let netY = volY + 50;
            const networkMap = new Map<string, string>();

            if (data.networks) {
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
                        } else {
                            warnings.push(`Service '${name}': depends_on '${depName}' not found in services.`);
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
                        } else {
                            // Could be an implicit default network or undefined
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

                        // Try to find named volume
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
                            // Local bind mount or anonymous
                            if (!sourceNode.config.volumes) sourceNode.config.volumes = [];
                            // Reconstruct string if object
                            const val = typeof volStr === 'string' ? volStr : `${source}:${target}`;
                            sourceNode.config.volumes.push(val);
                        }
                    });
                }
            }

            return { nodes: newNodes, connections: newConnections, warnings };

        } catch (e) {
            throw e;
        }
    }

    private downloadFile(filename: string, content: string) {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/yaml' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element); // Required for FireFox
        element.click();
        document.body.removeChild(element);
    }
}
