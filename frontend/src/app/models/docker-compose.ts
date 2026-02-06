export interface ComposeSpec {
    version?: string;
    services?: Record<string, ServiceSpec>;
    networks?: Record<string, NetworkSpec>;
    volumes?: Record<string, VolumeSpec>;
    secrets?: Record<string, any>;
    configs?: Record<string, any>;
}

export interface ServiceSpec {
    image?: string;
    build?: string | {
        context: string;
        dockerfile?: string;
        args?: Record<string, string>;
    };
    container_name?: string;
    ports?: (string | number)[];
    expose?: (string | number)[];
    environment?: Record<string, string> | string[];
    env_file?: string | string[];
    restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
    volumes?: string[];
    networks?: string[] | Record<string, any>;
    depends_on?: string[] | Record<string, { condition: string }>;
    command?: string | string[];
    entrypoint?: string | string[];
    healthcheck?: HealthcheckSpec;
    deploy?: DeploySpec;
    stdin_open?: boolean;
    tty?: boolean;
    labels?: Record<string, string>;
}

export interface HealthcheckSpec {
    test: string | string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
    disable?: boolean;
}

export interface DeploySpec {
    replicas?: number;
    resources?: {
        limits?: ResourceLimit;
        reservations?: ResourceLimit;
    };
}

export interface ResourceLimit {
    cpus?: string | number;
    memory?: string;
}

export interface NetworkSpec {
    driver?: string;
    external?: boolean | { name: string };
    internal?: boolean;
    attachable?: boolean;
    ipam?: {
        driver?: string;
        config?: { subnet?: string; gateway?: string }[];
    };
}

export interface VolumeSpec {
    driver?: string;
    driver_opts?: Record<string, string>;
    external?: boolean | { name: string };
    name?: string;
}
