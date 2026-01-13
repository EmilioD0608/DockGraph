export interface Socket {
    id: string;
    type: 'dependency' | 'volume' | 'network';
    dir: 'in' | 'out';
    label?: string;
    // Optional alignment or color override
}

export interface DockConnection {
    id: string;
    sourceNodeId: string;
    sourceSocketId: string;
    targetNodeId: string;
    targetSocketId: string;
    name?: string;
}

export interface DockerNodeData {
    // 1. Identidad (Clave en el YAML)
    id: string;             // ID único interno (ej: "node_123")
    label: string;          // El nombre del servicio en Docker (ej: "postgres-db", "backend")
    x: number;
    y: number;

    // 2. Metadatos Visuales (Para la UI de la tarjeta)
    type: 'service' | 'volume' | 'network'; // Para saber qué icono mostrar
    icon?: string;           // Clase de icono (ej: 'pi pi-database')
    color?: string;          // Hex color para el borde o cabecera (ej: '#3b82f6')

    inputs: Socket[];
    outputs: Socket[];

    // 3. Configuración Docker (El Payload real)
    config: {
        image?: string;         // ej: "postgres:14-alpine"

        ports?: string[];       // ej: ["5432:5432"]
        expose?: string[];      // internal only ports
        environment?: Record<string, string>; // ej: { POSTGRES_PASSWORD: "admin" }
        volumes?: string[];     // Rutas locales
        command?: string;
        restart?: 'always' | 'on-failure' | 'no' | 'unless-stopped';
        stdin_open?: boolean;   // -i
        tty?: boolean;          // -t

        // Network & Volume specific
        driver?: string;        // networks: bridge/host/overlay/none, volumes: local/etc
        external?: boolean;     // networks & volumes
        internal?: boolean;     // networks only
        ipam?: {                // networks only
            subnet?: string;
            gateway?: string;
        };
        driverOpts?: Record<string, string>; // volumes only
        name?: string;          // volumes (external name override)

        // Production Ready Additions
        build?: {               // service: alternative to image
            context: string;
            dockerfile?: string;
        };
        depends_on?: Record<string, { condition: string }>;
        container_name?: string;
        healthcheck?: {
            test: string[];
            interval: string;
            timeout: string;
            retries: number;
            start_period?: string;
        };
        deploy?: {
            resources: {
                limits: {
                    cpus?: string;
                    memory?: string;
                };
            };
        };
        // Map Volume Node ID -> Target Path inside container (e.g. "vol_123" -> "/var/lib/mysql")
        volumeMounts?: Record<string, string>;
    };
}
