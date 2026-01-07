import { Component, EventEmitter, Input, Output, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LucideAngularModule, X, Save, ChevronDown } from 'lucide-angular';
import { DockerNodeData } from '../../models/docker-node';

@Component({
    // ...
    selector: 'app-node-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './node-editor.component.html',
    styleUrls: ['./node-editor.component.css']
})
export class NodeEditorComponent {
    @Input() node: DockerNodeData | null = null;
    @Input() connectedVolumes: { id: string, label: string }[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() save = new EventEmitter<DockerNodeData>();

    readonly icons = { close: X, save: Save, chevron: ChevronDown };

    form: FormGroup;
    envVars: { key: string, value: string }[] = [];
    driverOptsList: { key: string, value: string }[] = [];
    volumeMountsList: { volumeId: string, volumeLabel: string, target: string }[] = [];

    isIpamExpanded = signal(false);
    isResourcesExpanded = signal(false);
    isHealthcheckExpanded = signal(false);

    popularImages = [
        'node:18-alpine', 'node:20', 'python:3.9-slim', 'python:3.11',
        'postgres:15-alpine', 'mysql:8', 'mongo:6', 'redis:7-alpine',
        'nginx:alpine', 'httpd:2.4', 'ubuntu:22.04', 'alpine:3.18',
        'traefik:v2.10', 'rabbitmq:3-management'
    ];

    showImageDropdown = signal(false);

    // We can use a simple array for filtering since the list is small
    filteredImages = signal<string[]>([]);

    // ...

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            label: ['', Validators.required],
            image: [''],
            // We will handle array/object fields manually or via sub-components for simplicity first phase
            ports: [''], // Comma separated for now
            volumes: [''], // Comma separated for now
            restart: ['no'],
            driver: [''],
            external: [false],
            internal: [false],
            subnet: [''],
            gateway: [''],
            externalName: [''],

            // New fields
            buildContext: [''],
            buildDockerfile: [''],
            useBuild: [false], // UI toggle
            containerName: [''],
            cpuLimit: [''],
            memLimit: ['']
        });

        effect(() => {
            if (this.node) {
                this.form.patchValue({
                    label: this.node.label,
                    image: this.node.config.image || '',
                    ports: (this.node.config.ports || []).join(', '),
                    volumes: (this.node.config.volumes || []).join(', '),
                    restart: this.node.config.restart || 'no',
                    driver: this.node.config.driver || (this.node.type === 'network' ? 'bridge' : 'local'),
                    external: this.node.config.external || false,
                    internal: this.node.config.internal || false,
                    subnet: this.node.config.ipam?.subnet || '',
                    gateway: this.node.config.ipam?.gateway || '',
                    externalName: this.node.config.name || '',

                    // Patch New Fields
                    useBuild: !!this.node.config.build,
                    buildContext: this.node.config.build?.context || '.',
                    buildDockerfile: this.node.config.build?.dockerfile || '',
                    containerName: this.node.config.container_name || '',
                    cpuLimit: this.node.config.deploy?.resources?.limits?.cpus || '',
                    memLimit: this.node.config.deploy?.resources?.limits?.memory || ''
                });

                // Parse Volume Mounts
                this.volumeMountsList = this.connectedVolumes.map(vol => ({
                    volumeId: vol.id,
                    volumeLabel: vol.label,
                    target: this.node?.config.volumeMounts?.[vol.id] || '/app/data'
                }));

                // Parse Env Vars
                this.envVars = Object.entries(this.node.config.environment || {})
                    .map(([key, value]) => ({ key, value: String(value) }));



                // Parse Driver Opts
                this.driverOptsList = Object.entries(this.node.config.driverOpts || {})
                    .map(([key, value]) => ({ key, value: String(value) }));

                // Init filtered images
                this.filterImages(this.node.config.image || '');
            }
        });
    }

    // ... ngOnChanges ...
    ngOnChanges() {
        if (this.node) {
            this.form.patchValue({
                label: this.node.label,
                image: this.node.config.image || '',
                ports: (this.node.config.ports || []).join(', '),
                volumes: (this.node.config.volumes || []).join(', '),
                restart: this.node.config.restart || 'no',
                driver: this.node.config.driver || (this.node.type === 'network' ? 'bridge' : 'local'),
                external: this.node.config.external || false,
                internal: this.node.config.internal || false,
                subnet: this.node.config.ipam?.subnet || '',
                gateway: this.node.config.ipam?.gateway || '',
                externalName: this.node.config.name || '',

                // Patch New Fields
                useBuild: !!this.node.config.build,
                buildContext: this.node.config.build?.context || '.',
                buildDockerfile: this.node.config.build?.dockerfile || '',
                containerName: this.node.config.container_name || '',
                cpuLimit: this.node.config.deploy?.resources?.limits?.cpus || '',
                memLimit: this.node.config.deploy?.resources?.limits?.memory || ''
            });

            // Parse Volume Mounts
            this.volumeMountsList = this.connectedVolumes.map(vol => ({
                volumeId: vol.id,
                volumeLabel: vol.label,
                target: this.node?.config.volumeMounts?.[vol.id] || '/app/data'
            }));

            this.envVars = Object.entries(this.node.config.environment || {})
                .map(([key, value]) => ({ key, value: String(value) }));

            this.driverOptsList = Object.entries(this.node.config.driverOpts || {})
                .map(([key, value]) => ({ key, value: String(value) }));

            this.filterImages(this.node.config.image || '');
        }
    }



    filterImages(query: string) {
        const lowerQ = query.toLowerCase();
        this.filteredImages.set(
            this.popularImages.filter(img => img.toLowerCase().includes(lowerQ))
        );
    }

    onImageInput(event: Event) {
        const input = event.target as HTMLInputElement;
        this.filterImages(input.value);
        this.showImageDropdown.set(true);
    }

    selectImage(img: string) {
        this.form.patchValue({ image: img });
        this.showImageDropdown.set(false);
    }

    toggleImageDropdown() {
        this.showImageDropdown.update(v => !v);
        // If opening, filter by current value
        if (this.showImageDropdown()) {
            this.filterImages(this.form.get('image')?.value || '');
        }
    }

    closeImageDropdown() {
        // meaningful delay to allow click event on item to register
        setTimeout(() => {
            this.showImageDropdown.set(false);
        }, 200);
    }

    addEnvVar() {
        this.envVars.push({ key: '', value: '' });
    }

    removeEnvVar(index: number) {
        this.envVars.splice(index, 1);
    }

    updateEnvKey(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.envVars[index].key = input.value;
    }

    updateEnvValue(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.envVars[index].value = input.value;
    }

    addDriverOpt() {
        this.driverOptsList.push({ key: '', value: '' });
    }

    removeDriverOpt(index: number) {
        this.driverOptsList.splice(index, 1);
    }

    updateDriverOptKey(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.driverOptsList[index].key = input.value;
    }

    updateDriverOptValue(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.driverOptsList[index].value = input.value;
    }

    toggleIpam() {
        this.isIpamExpanded.update(v => !v);
    }

    toggleResources() {
        this.isResourcesExpanded.update(v => !v);
    }

    toggleHealthcheck() {
        this.isHealthcheckExpanded.update(v => !v);
    }

    updateMountTarget(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.volumeMountsList[index].target = input.value;
    }

    onSubmit() {
        if (!this.node) return;

        const formVal = this.form.value;
        let newConfig = { ...this.node.config };

        if (this.node.type === 'service') {
            // Reconstruct Environment Object
            const envObj: Record<string, string> = {};
            this.envVars.forEach(v => {
                if (v.key) envObj[v.key] = v.value;
            });

            // Helper to split string to array
            const splitList = (val: string | any[]) => {
                if (typeof val === 'string') {
                    return val.split(',').map(s => s.trim()).filter(s => s);
                }
                return Array.isArray(val) ? val : [];
            };

            newConfig = {
                ...newConfig,
                image: formVal.image,
                ports: splitList(formVal.ports),
                volumes: splitList(formVal.volumes),
                restart: formVal.restart,
                environment: envObj
            };

            // Handle Build vs Image
            if (formVal.useBuild) {
                newConfig.image = undefined; // Clear image if using build
                newConfig.build = {
                    context: formVal.buildContext,
                    dockerfile: formVal.buildDockerfile || undefined
                };
            } else {
                newConfig.build = undefined;
                newConfig.image = formVal.image;
            }

            // Container Name
            if (formVal.containerName) newConfig.container_name = formVal.containerName;

            // Resources
            if (formVal.cpuLimit || formVal.memLimit) {
                newConfig.deploy = {
                    resources: {
                        limits: {
                            cpus: formVal.cpuLimit || undefined,
                            memory: formVal.memLimit || undefined
                        }
                    }
                };
            }

            // Volume Mounts
            const mountsMap: Record<string, string> = {};
            this.volumeMountsList.forEach(m => {
                mountsMap[m.volumeId] = m.target;
            });
            newConfig.volumeMounts = mountsMap;

            // Healthcheck
            if (formVal.hcTest) {
                newConfig.healthcheck = {
                    test: ["CMD-SHELL", formVal.hcTest], // Defaulting to CMD-SHELL for simplicity
                    interval: formVal.hcInterval || '30s',
                    timeout: formVal.hcTimeout || '10s',
                    retries: Number(formVal.hcRetries) || 3,
                    start_period: formVal.hcStartPeriod || '0s'
                };
            } else {
                newConfig.healthcheck = undefined;
            }
        } else if (this.node.type === 'network') {
            newConfig = {
                ...newConfig,
                driver: formVal.driver,
                external: formVal.external,
                internal: formVal.internal,
                ipam: (formVal.subnet || formVal.gateway) ? {
                    subnet: formVal.subnet,
                    gateway: formVal.gateway
                } : undefined
            };
        } else if (this.node.type === 'volume') {
            const driverOptsObj: Record<string, string> = {};
            this.driverOptsList.forEach(v => {
                if (v.key) driverOptsObj[v.key] = v.value;
            });

            newConfig = {
                ...newConfig,
                driver: formVal.driver,
                external: formVal.external,
                name: formVal.external ? formVal.externalName : undefined,
                driverOpts: driverOptsObj
            };
        }

        const updatedNode: DockerNodeData = {
            ...this.node,
            label: formVal.label,
            config: newConfig
        };

        this.save.emit(updatedNode);
    }
}
