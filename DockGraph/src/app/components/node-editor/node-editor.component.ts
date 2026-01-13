import { Component, EventEmitter, Input, Output, signal, effect, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LucideAngularModule, X, Save, ChevronDown } from 'lucide-angular';
import { DockerNodeData } from '../../models/docker-node';
import { LanguageService } from '../../services/language.service';

@Component({
    // ...
    selector: 'app-node-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './node-editor.component.html',
    styleUrls: ['./node-editor.component.css']
})
export class NodeEditorComponent {
    public languageService = inject(LanguageService);

    @Input() node: DockerNodeData | null = null;
    @Input() connectedVolumes: { id: string, label: string }[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() save = new EventEmitter<DockerNodeData>();

    readonly icons = { close: X, save: Save, chevron: ChevronDown };

    form: FormGroup;
    envVars: { key: string, value: string }[] = [];
    driverOptsList: { key: string, value: string }[] = [];
    portEntries: { mode: 'public' | 'internal', hostPort: string, containerPort: string }[] = [];
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
            // ports field removed from form control as we handle it manually
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
            stdin_open: [false],
            tty: [false],
            cpuLimit: [''],
            memLimit: [''],
            hcTest: [''],
            hcInterval: [''],
            hcTimeout: [''],
            hcRetries: [''],
            hcStartPeriod: ['']
        });

        effect(() => {
            if (this.node) {
                this.form.patchValue({
                    label: this.node.label,
                    image: this.node.config.image || '',
                    // ports: ... removed
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
                    stdin_open: !!this.node.config.stdin_open,
                    tty: !!this.node.config.tty,
                    cpuLimit: this.node.config.deploy?.resources?.limits?.cpus || '',
                    memLimit: this.node.config.deploy?.resources?.limits?.memory || '',
                    hcTest: this.parseHealthTest(this.node.config.healthcheck?.test),
                    hcInterval: this.node.config.healthcheck?.interval || '',
                    hcTimeout: this.node.config.healthcheck?.timeout || '',
                    hcRetries: this.node.config.healthcheck?.retries || '',
                    hcStartPeriod: this.node.config.healthcheck?.start_period || ''
                });

                // Parse Ports
                this.portEntries = [];
                // 1. Ports (Public)
                if (this.node.config.ports) {
                    this.node.config.ports.forEach(p => {
                        const parts = p.split(':');
                        if (parts.length === 2) {
                            this.portEntries.push({ mode: 'public', hostPort: parts[0], containerPort: parts[1] });
                        } else {
                            this.portEntries.push({ mode: 'public', hostPort: '', containerPort: parts[0] });
                        }
                    });
                }
                // 2. Expose (Internal)
                if (this.node.config.expose) {
                    this.node.config.expose.forEach(p => {
                        this.portEntries.push({ mode: 'internal', hostPort: '', containerPort: p });
                    });
                }

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
                // ports removed
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
                stdin_open: !!this.node.config.stdin_open,
                tty: !!this.node.config.tty,
                cpuLimit: this.node.config.deploy?.resources?.limits?.cpus || '',
                memLimit: this.node.config.deploy?.resources?.limits?.memory || '',
                hcTest: this.parseHealthTest(this.node.config.healthcheck?.test),
                hcInterval: this.node.config.healthcheck?.interval || '',
                hcTimeout: this.node.config.healthcheck?.timeout || '',
                hcRetries: this.node.config.healthcheck?.retries || '',
                hcStartPeriod: this.node.config.healthcheck?.start_period || ''
            });

            // Parse Ports
            this.portEntries = [];
            if (this.node.config.ports) {
                this.node.config.ports.forEach(p => {
                    const parts = p.split(':');
                    if (parts.length === 2) {
                        this.portEntries.push({ mode: 'public', hostPort: parts[0], containerPort: parts[1] });
                    } else {
                        this.portEntries.push({ mode: 'public', hostPort: '', containerPort: parts[0] });
                    }
                });
            }
            if (this.node.config.expose) {
                this.node.config.expose.forEach(p => {
                    this.portEntries.push({ mode: 'internal', hostPort: '', containerPort: p });
                });
            }

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

    // PORTS MANGEMENT
    addPort() {
        this.portEntries.push({ mode: 'public', hostPort: '8080', containerPort: '80' });
    }

    removePort(index: number) {
        this.portEntries.splice(index, 1);
    }

    updatePortMode(index: number, event: Event) {
        const select = event.target as HTMLSelectElement;
        this.portEntries[index].mode = select.value as 'public' | 'internal';
    }

    updateHostPort(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.portEntries[index].hostPort = input.value;
    }

    updateContainerPort(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        this.portEntries[index].containerPort = input.value;
    }

    private parseHealthTest(test: string[] | undefined): string {
        if (!test || test.length === 0) return '';
        // If CMD-SHELL, return the command string (index 1)
        if (test[0] === 'CMD-SHELL' && test.length > 1) return test[1];
        // If CMD (exec), join them to look like shell command
        if (test[0] === 'CMD') return test.slice(1).join(' ');
        // Fallback
        return test.join(' ');
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

            // Reconstruct Ports and Expose
            const ports: string[] = [];
            const expose: string[] = [];

            this.portEntries.forEach(p => {
                if (p.mode === 'public') {
                    if (p.hostPort) {
                        ports.push(`${p.hostPort}:${p.containerPort}`);
                    } else {
                        ports.push(p.containerPort); // Random host port
                    }
                } else {
                    expose.push(p.containerPort);
                }
            });

            newConfig = {
                ...newConfig,
                image: formVal.image,
                ports: ports,
                expose: expose,
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

            // Interactive Mode
            newConfig.stdin_open = formVal.stdin_open || undefined;
            newConfig.tty = formVal.tty || undefined;

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
