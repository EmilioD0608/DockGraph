import { Injectable } from '@angular/core';
import * as dagre from 'dagre';
import { DockerNodeData, DockConnection } from '../models/docker-node';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {

    constructor() { }

    /**
     * Calcula y aplica un layout automático a los nodos.
     * @param nodes Lista actual de nodos
     * @param connections Lista actual de conexiones
     * @param direction Dirección del flujo ('LR' = Izquierda-Derecha, 'TB' = Arriba-Abajo)
     * @returns Nueva lista de nodos con posiciones x, y actualizadas
     */
    applyLayout(nodes: DockerNodeData[], connections: DockConnection[], direction: 'LR' | 'TB' = 'LR'): DockerNodeData[] {
        const g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: direction,
            // align: 'DL', // Alignment option (UL, UR, DL, DR) - dagre default is usually balanced
            nodesep: 60,  // Espacio horizontal entre nodos hermanos
            ranksep: 120, // Espacio vertical entre niveles jerárquicos
            marginx: 50,
            marginy: 50
        });

        g.setDefaultEdgeLabel(() => ({}));

        // 1. Agregar nodos con dimensiones estimadas
        nodes.forEach(node => {
            // Estimamos dimensiones para asegurar que no se solapen.
            // Los valores deben ser ligeramente mayores al tamaño real renderizado para dar aire.
            let width = 250;
            let height = 150;

            if (node.type === 'service') {
                width = 320; // Tarjeta de servicio más ancha
                height = 220; // Y más alta por puertos/envs
            } else if (node.type === 'volume' || node.type === 'network') {
                width = 200;
                height = 120;
            }

            g.setNode(node.id, { width, height });
        });

        // 2. Agregar arcos (conexiones)
        connections.forEach(conn => {
            g.setEdge(conn.sourceNodeId, conn.targetNodeId);
        });

        // 3. Ejecutar algoritmo
        dagre.layout(g);

        // 4. Mapear posiciones de vuelta (Ajustando Center -> Top-Left)
        const layoutedNodes = nodes.map(node => {
            const layoutNode = g.node(node.id);

            // dagre devuelve x,y como el centro del nodo.
            // Si nuestro sistema de coordenadas usa top-left:
            const newX = layoutNode.x - (layoutNode.width / 2);
            const newY = layoutNode.y - (layoutNode.height / 2);

            return {
                ...node,
                x: newX,
                y: newY
            };
        });

        return layoutedNodes;
    }
}
