export interface TranslationDictionary {
    SETTINGS: {
        TITLE: string;
        LANGUAGE: string;
        SOON: string;
        SOON_DESC: string;
    };
    TITLES: {
        RELATIONS: string;
        GALLERY: string;
        SETTINGS: string;
    };
    TOOLTIPS: {
        RELATIONS: string;
        GALLERY: string;
        SETTINGS: string;
        DELETE: string;
    };
    RELATIONS: {
        SOURCE: string;
        TARGET: string;
        SELECT: string;
        CREATE_BTN: string;
        NAME_PLACEHOLDER: string;
        EMPTY_STATE: string;
    };
    CONTEXT_MENU: {
        NEW_NODE: string;
        AREA_SELECTION: string;
        ADD_NODE_TITLE: string;
        SEARCH_PLACEHOLDER: string;
        SERVICE: string;
        VOLUME: string;
        NETWORK: string;
        EDIT: string;
        DELETE: string;
    };
    CANVAS: {
        PORTS_CONFIGURED: string;
        BUILD_CONTEXT: string;
        EXTERNAL_VOLUME: string;
        INTERNAL_NETWORK: string;
    };
    NODE_EDITOR: {
        TITLE: string;
        NAME_LABEL: {
            SERVICE: string;
            VOLUME: string;
            NETWORK: string;
        };
        USE_BUILD: string;
        BUILD_CONTEXT: string;
        DOCKERFILE_OPT: string;
        IMAGE: string;
        CONTAINER_NAME: string;
        PORTS: string;
        ADD: string;
        VOL_MOUNTS: string;
        RESOURCES: string;
        HEALTHCHECK: string;
        RESTART: string;
        ENV_VARS: string;
        EXT_NET: string;
        EXT_NET_HINT: string;
        DRIVER: string;
        INTERNAL_ONLY: string;
        IPAM: string;
        SUBNET: string;
        GATEWAY: string;
        EXT_VOL: string;
        VOL_NAME_HOST: string;
        DRIVER_OPTS: string;
        SAVE: string;
        STDIN_OPEN: string;
        TTY: string;
    };
    DIALOGS: {
        DELETE_RELATION_TITLE: string;
        DELETE_RELATION_MSG: string;
        CONFIRM: string;
        CANCEL: string;
    };
}

export const EN: TranslationDictionary = {
    SETTINGS: {
        TITLE: 'Configuration',
        LANGUAGE: 'Language',
        SOON: 'Coming Soon',
        SOON_DESC: 'More administration options will be available here.'
    },
    TITLES: {
        RELATIONS: 'Administration',
        GALLERY: 'Gallery',
        SETTINGS: 'Configuration'
    },
    TOOLTIPS: {
        RELATIONS: 'Relations',
        GALLERY: 'Service Gallery',
        SETTINGS: 'Configuration',
        DELETE: 'Delete'
    },
    RELATIONS: {
        SOURCE: 'Source (Service)',
        TARGET: 'Target',
        SELECT: 'Select...',
        CREATE_BTN: 'Create Relation',
        NAME_PLACEHOLDER: 'Reference name...',
        EMPTY_STATE: 'No relations created'
    },
    CONTEXT_MENU: {
        NEW_NODE: 'New Node',
        AREA_SELECTION: 'Area Selection',
        ADD_NODE_TITLE: 'Add Node',
        SEARCH_PLACEHOLDER: 'Search...',
        SERVICE: 'Service',
        VOLUME: 'Volume',
        NETWORK: 'Network',
        EDIT: 'Edit',
        DELETE: 'Delete'
    },
    CANVAS: {
        PORTS_CONFIGURED: 'Ports Configured',
        BUILD_CONTEXT: 'Build Context',
        EXTERNAL_VOLUME: 'External Volume',
        INTERNAL_NETWORK: 'Internal Network Only'
    },
    NODE_EDITOR: {
        TITLE: 'Edit Node',
        NAME_LABEL: {
            SERVICE: 'Service Name',
            VOLUME: 'Volume Name',
            NETWORK: 'Network Name'
        },
        USE_BUILD: 'Use Build Context (Dockerfile)',
        BUILD_CONTEXT: 'Build Context',
        DOCKERFILE_OPT: 'Dockerfile (Optional)',
        IMAGE: 'Docker Image',
        CONTAINER_NAME: 'Container Name',
        PORTS: 'Ports',
        ADD: '+ Add',
        VOL_MOUNTS: 'Volume Mounts',
        RESOURCES: 'Resources (Deploy)',
        HEALTHCHECK: 'Healthcheck',
        RESTART: 'Restart Policy',
        ENV_VARS: 'Environment Variables',
        EXT_NET: 'External Network',
        EXT_NET_HINT: 'Use existing network outside compose',
        DRIVER: 'Driver',
        INTERNAL_ONLY: 'Internal Only (No Internet)',
        IPAM: 'IPAM Config',
        SUBNET: 'Subnet',
        GATEWAY: 'Gateway',
        EXT_VOL: 'External Volume',
        VOL_NAME_HOST: 'Volume Name (on Host)',
        DRIVER_OPTS: 'Driver Options',
        SAVE: 'Save',
        STDIN_OPEN: 'Interactive (stdin_open)',
        TTY: 'TTY (Pseudo-terminal)'
    },
    DIALOGS: {
        DELETE_RELATION_TITLE: 'Delete Relation',
        DELETE_RELATION_MSG: 'Are you sure you want to delete this relation? This action cannot be undone.',
        CONFIRM: 'Delete',
        CANCEL: 'Cancel'
    }
};

export const ES: TranslationDictionary = {
    SETTINGS: {
        TITLE: 'Configuración',
        LANGUAGE: 'Idioma',
        SOON: 'Próximamente',
        SOON_DESC: 'Más opciones de administración estarán disponibles aquí.'
    },
    TITLES: {
        RELATIONS: 'Administración',
        GALLERY: 'Galería',
        SETTINGS: 'Configuración'
    },
    TOOLTIPS: {
        RELATIONS: 'Relaciones',
        GALLERY: 'Galería de Servicios',
        SETTINGS: 'Configuración',
        DELETE: 'Eliminar'
    },
    RELATIONS: {
        SOURCE: 'Origen (Servicio)',
        TARGET: 'Destino',
        SELECT: 'Seleccionar...',
        CREATE_BTN: 'Crear Relación',
        NAME_PLACEHOLDER: 'Nombre de referencia...',
        EMPTY_STATE: 'No hay relaciones creadas'
    },
    CONTEXT_MENU: {
        NEW_NODE: 'Nuevo nodo',
        AREA_SELECTION: 'Selección por área',
        ADD_NODE_TITLE: 'Añadir Nodo',
        SEARCH_PLACEHOLDER: 'Buscar...',
        SERVICE: 'Servicio',
        VOLUME: 'Volumen',
        NETWORK: 'Red',
        EDIT: 'Editar',
        DELETE: 'Eliminar'
    },
    CANVAS: {
        PORTS_CONFIGURED: 'Puertos Configurados',
        BUILD_CONTEXT: 'Contexto de Build',
        EXTERNAL_VOLUME: 'Volumen Externo',
        INTERNAL_NETWORK: 'Solo Red Interna'
    },
    NODE_EDITOR: {
        TITLE: 'Editar Nodo',
        NAME_LABEL: {
            SERVICE: 'Nombre del Servicio',
            VOLUME: 'Nombre del Volumen',
            NETWORK: 'Nombre de la Red'
        },
        USE_BUILD: 'Usar Build Context (Dockerfile)',
        BUILD_CONTEXT: 'Contexto de Build',
        DOCKERFILE_OPT: 'Dockerfile (Opcional)',
        IMAGE: 'Imagen Docker',
        CONTAINER_NAME: 'Nombre del Contenedor',
        PORTS: 'Puertos',
        ADD: '+ Añadir',
        VOL_MOUNTS: 'Montaje de Volúmenes',
        RESOURCES: 'Recursos (Deploy)',
        HEALTHCHECK: 'Check de Salud (Healthcheck)',
        RESTART: 'Política de Reinicio',
        ENV_VARS: 'Variables de Entorno',
        EXT_NET: 'Red Externa',
        EXT_NET_HINT: 'Usar red existente fuera de compose',
        DRIVER: 'Driver',
        INTERNAL_ONLY: 'Solo Interno (Sin Internet)',
        IPAM: 'Configuración IPAM',
        SUBNET: 'Subred',
        GATEWAY: 'Puerta de Enlace (Gateway)',
        EXT_VOL: 'Volumen Externo',
        VOL_NAME_HOST: 'Nombre del Volumen (en Host)',
        DRIVER_OPTS: 'Opciones del Driver',
        SAVE: 'Guardar',
        STDIN_OPEN: 'Interactivo (stdin_open)',
        TTY: 'TTY (Pseudo-terminal)'
    },
    DIALOGS: {
        DELETE_RELATION_TITLE: 'Eliminar Relación',
        DELETE_RELATION_MSG: '¿Estás seguro de que quieres eliminar esta relación? Esta acción no se puede deshacer.',
        CONFIRM: 'Eliminar',
        CANCEL: 'Cancelar'
    }
};

export const DICTIONARIES: { [key: string]: TranslationDictionary } = {
    'en': EN,
    'es': ES
};
