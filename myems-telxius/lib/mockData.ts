import { BDFBData, HistoryDataPoint, MQTTPayload, Substructure, Position } from './types';

// Helper to generate 24h of random but realistic data (NO SE TOCA)
const generateHistory = (baseV: number, baseA: number): HistoryDataPoint[] => {
    return Array.from({ length: 24 }, (_, i) => {
        // Use i to make it deterministic but variable
        const shiftV = (i % 5) * 0.1 - 0.2; 
        const shiftA = (i % 10) * 2 - 10;
        return {
            time: `${i}:00`,
            voltage: baseV + shiftV,
            current: baseA + shiftA,
            power: (baseV * baseA / 1000) + (shiftV * shiftA / 1000)
        };
    });
};

const DEVICE_LABELS = [
    "Router-CORE", "Switch-EDGE", "ODF-01", "BTS-Node", "Rectifier", "UPS", "Server-01", "Firewall", "OLT", "METER", "TEMP"
];



const generateBreakers = (panelId: string) => {
    return Array.from({ length: 24 }, (_, i) => {
        // Deterministic occupancy based on index and panelId
        const seed = (i + panelId.charCodeAt(0)) % 10;
        const occupied = seed > 3; 
        if (!occupied) return { id: `${panelId}-empty-${i}`, position: i + 1, status: "empty" as const };
        
        const voltage = 12 + (i % 3) * 0.5;
        const current = 5 + (i % 15) * 5;
        return {
            id: `${panelId}-b-${i}`,
            position: i + 1,
            status: "occupied" as const,
            label: DEVICE_LABELS[i % DEVICE_LABELS.length],
            voltage: voltage.toFixed(2),
            current: current.toFixed(1),
            online: (i % 20) !== 0 // 1 in 20 is offline
        };
    });
};

// --- SPATIAL MOCK DATA (ROOMS & POSITIONS) ---

export const MOCK_SUBSTRUCTURE_S01: Substructure = {
    id: "sala-tx-01",
    name: "SALA-01",
    type: "ROOM",
    gridRows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
    gridCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    siteName: "Telxius Site Alpha",
    buildingName: "Building 01",
    perimeter: JSON.stringify([[0,0], [720,0], [720,780], [0,780]]), 
    referencePoints: JSON.stringify([
        {x: 10, y: 720, type: 'DOOR', label: 'ACCESO SUR'}
    ]) // Only 1 door per room
};

export const MOCK_SUBSTRUCTURE_S02: Substructure = {
    id: "sala-tx-02",
    name: "SALA-02",
    type: "ROOM",
    gridRows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
    gridCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    siteName: "Telxius Site Alpha",
    buildingName: "Building 02",
    perimeter: JSON.stringify([[0,0], [720,0], [720,780], [0,780]]),
    referencePoints: JSON.stringify([
        {x: 710, y: 10, type: 'DOOR', label: 'ACCESO NORTE'}
    ])
};

const generatePositions = (sub: Substructure, hardcodedEquip: {deviceId: string; row: string; col: number; label: string; wTiles?: number; dTiles?: number}[]) => {
    const list: Position[] = [];
    const bayRows = ["C", "G", "K"]; 
    
    sub.gridRows.forEach((row, ri) => {
        sub.gridCols.forEach((col, ci) => {
            const equip = hardcodedEquip.find(b => b.row === row && b.col === col);
            const isInBay = bayRows.includes(row) && col >= 2 && col <= 11;
            
            // Check if this tile is visually hidden/covered by a larger equipment starting strictly to its left or top
            // (A simple heuristic to prevent random RACK-GENs from sprouting underneath a big tank)
            const isCovered = hardcodedEquip.some(b => {
                const bRi = sub.gridRows.indexOf(b.row);
                if (bRi === -1) return false;
                const rowSpan = Math.ceil(b.dTiles || 1);
                const colSpan = Math.ceil(b.wTiles || 1);
                
                return (ri >= bRi && ri < bRi + rowSpan) && (col >= b.col && col < b.col + colSpan) && !(ri === bRi && col === b.col);
            });
            
            const seed = (ri * 13 + ci * 7) % 100;
            let status: 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'ERROR' | 'WARNING' = 'EMPTY';
            
            if (equip) {
                status = 'OCCUPIED';
            } else if (isCovered) {
                status = 'EMPTY'; // Force empty so we don't draw overlapping random racks
            } else if (isInBay) {
                // Generate some varied statuses
                status = seed > 85 ? 'ERROR' : (seed > 70 ? 'WARNING' : (seed > 40 ? 'OCCUPIED' : (seed > 25 ? 'RESERVED' : 'EMPTY')));
            } else {
                status = 'EMPTY';
            }
            
            let fedBy: string | undefined;
            if (isInBay && status !== 'EMPTY' && !equip?.label?.startsWith('BDFB')) {
                if (row === 'C') fedBy = 'bdfb-1';
                if (row === 'G') fedBy = 'bdfb-2';
                if (row === 'K') fedBy = 'bdfb-3';
            }
            
            list.push({
                id: `pos-${sub.id}-${row}-${col}`,
                substructureId: sub.id,
                row, col,
                widthUnits: 1, depthUnits: 1,
                // If it's a defined equip, use its custom dimensions (in tiles * 60cm base)
                physOffsetX: 0, 
                physOffsetY: 0,
                physWidthCm: equip?.wTiles ? equip.wTiles * 60 : 60, 
                physDepthCm: equip?.dTiles ? equip.dTiles * 60 : 60, 
                status, 
                deviceId: equip?.deviceId, 
                fedBy,
                label: equip?.label || (status !== 'EMPTY' && status !== 'RESERVED' && !isCovered ? 'RACK-GEN' : undefined)
            });
        });
    });
    return list;
};

export const MOCK_POSITIONS_S01 = generatePositions(MOCK_SUBSTRUCTURE_S01, [
    // BDFB at the right side of each bay
    // Bay 1: Row C (Cols 2-11). BDFB-01 at Col 11.
    { deviceId: "bdfb-1", row: "C", col: 11, label: "BDFB-01" },
    // NUEVO EQUIPO GRANDE EN BAHÍA 1 (Ocupa 2.5 tiles ancho, 1.8 tiles fondo)
    { deviceId: "megarack-99", row: "C", col: 5, label: "MEGA-TANK-01", wTiles: 2.5, dTiles: 1.8 },
    // Bay 2: Row G (Cols 2-11). BDFB-02 at Col 11.
    { deviceId: "bdfb-2", row: "G", col: 11, label: "BDFB-02" },
]);

export const MOCK_POSITIONS_S02 = generatePositions(MOCK_SUBSTRUCTURE_S02, [
    // Bay 3: Row K (Cols 2-11). BDFB-03 at Col 11.
    { deviceId: "bdfb-3", row: "K", col: 11, label: "BDFB-03" }
]);

// Helper for BDFB Page logic
export const getRoomData = (subId: string) => {
    if (subId === MOCK_SUBSTRUCTURE_S02.id) return { substructure: MOCK_SUBSTRUCTURE_S02, positions: MOCK_POSITIONS_S02 };
    return { substructure: MOCK_SUBSTRUCTURE_S01, positions: MOCK_POSITIONS_S01 };
};

export const BDFB_MOCK_DATA: BDFBData[] = [
    {
        id: "bdfb-1",
        sn: "25110703400009",
        name: "BDFB-1",
        location: "SALA-01",
        substructureId: "sala-tx-01",
        telemetry: {
            voltage: 48.33,
            voltageHistory: { avg: 48.25, max: 48.55, min: 47.92, trend: 'stable' },
            current: 302.8,
            currentHistory: { avg: 295.4, max: 315.2, min: 280.1, trend: 'up' },
            power: 14.63,
            powerHistory: { avg: 14.22, max: 15.25, min: 13.50, trend: 'stable' },
            energy: 75.20,
            energyHistory: { avg: 72.10, max: 75.20, min: 68.45, trend: 'up' },
        },
        telemetryHistory: generateHistory(48.3, 305),
        connections: [
            { id: "conn-1", port: "Port 12", panelName: "A1", position: 12, status: "Activo", clientName: "ROUTER-CORE-TX", meterPort: "P1_A1_12" },
            { id: "conn-2", port: "Port 13", panelName: "A2", position: 12, status: "Reservado", clientName: "SWITCH-EDGE-01", meterPort: "P1_A2_12" },
            { id: "conn-3", port: "Port 05", panelName: "B1", position: 5, status: "Activo", clientName: "FIREWALL-01", meterPort: "P1_B1_05" },
            { id: "conn-4", port: "Port 08", panelName: "B2", position: 8, status: "Activo", clientName: "OLT-DIST-01", meterPort: "P1_B2_08" }
        ],
        panels: [
            { id: "p1", name: "A1", installedCapacity: 800, assignedCapacity: 600, consumedCapacity: 450, reservedCapacity: 100, breakers: generateBreakers("p1") },
            { id: "p2", name: "B1", installedCapacity: 800, assignedCapacity: 400, consumedCapacity: 300, reservedCapacity: 50, breakers: generateBreakers("p2") },
            { id: "p3", name: "A2", installedCapacity: 800, assignedCapacity: 700, consumedCapacity: 680, reservedCapacity: 50, breakers: generateBreakers("p3") },
            { id: "p4", name: "B2", installedCapacity: 800, assignedCapacity: 200, consumedCapacity: 150, reservedCapacity: 0, breakers: generateBreakers("p4") }
        ]
    },
    {
        id: "bdfb-2",
        sn: "25110703400010",
        name: "BDFB-2",
        location: "SALA-01",
        substructureId: "sala-tx-01",
        telemetry: {
            voltage: 48.15,
            voltageHistory: { avg: 48.12, max: 48.30, min: 48.00, trend: 'stable' },
            current: 120.4,
            currentHistory: { avg: 118.5, max: 125.0, min: 110.0, trend: 'stable' },
            power: 5.79,
            powerHistory: { avg: 5.70, max: 6.10, min: 5.40, trend: 'stable' },
            energy: 32.10,
            energyHistory: { avg: 30.5, max: 32.1, min: 28.2, trend: 'up' },
        },
        telemetryHistory: generateHistory(48.1, 120),
        connections: [
            { id: "conn-b2-1", port: "Port 03", panelName: "A1", position: 3, status: "Activo", clientName: "MODEM-HEADEND", meterPort: "P2_A1_03" },
            { id: "conn-b2-2", port: "Port 10", panelName: "B1", position: 10, status: "Activo", clientName: "WIFI-CONTROLLER", meterPort: "P2_B1_10" }
        ],
        panels: [
            { id: "p5", name: "A1", installedCapacity: 800, assignedCapacity: 300, consumedCapacity: 250, reservedCapacity: 50, breakers: generateBreakers("p5") },
            { id: "p6", name: "B1", installedCapacity: 800, assignedCapacity: 100, consumedCapacity: 80, reservedCapacity: 200, breakers: generateBreakers("p6") },
            { id: "p7", name: "A2", installedCapacity: 800, assignedCapacity: 0, consumedCapacity: 0, reservedCapacity: 0, breakers: generateBreakers("p7") },
            { id: "p8", name: "B2", installedCapacity: 800, assignedCapacity: 0, consumedCapacity: 0, reservedCapacity: 0, breakers: generateBreakers("p8") }
        ]
    },
    {
        id: "bdfb-3",
        sn: "25110703400011",
        name: "BDFB-3",
        location: "SALA-02",
        substructureId: "sala-tx-02",
        telemetry: {
            voltage: 48.20,
            voltageHistory: { avg: 48.15, max: 48.45, min: 48.05, trend: 'stable' },
            current: 410.5,
            currentHistory: { avg: 405.2, max: 425.0, min: 390.0, trend: 'up' },
            power: 19.78,
            powerHistory: { avg: 19.50, max: 20.80, min: 18.20, trend: 'up' },
            energy: 112.5,
            energyHistory: { avg: 108.2, max: 112.5, min: 102.1, trend: 'up' },
        },
        telemetryHistory: generateHistory(48.2, 410),
        connections: [
            { id: "conn-b3-1", port: "Port 01", panelName: "A1", position: 1, status: "Activo", clientName: "CORE-SWITCH-02", meterPort: "P3_A1_01" },
            { id: "conn-b3-2", port: "Port 20", panelName: "A1", position: 20, status: "Activo", clientName: "SAN-STORAGE-01", meterPort: "P3_A1_20" }
        ],
        panels: [
            { id: "p9", name: "A1", installedCapacity: 800, assignedCapacity: 750, consumedCapacity: 720, reservedCapacity: 40, breakers: generateBreakers("p9") },
            { id: "p10", name: "B1", installedCapacity: 800, assignedCapacity: 500, consumedCapacity: 480, reservedCapacity: 100, breakers: generateBreakers("p10") },
            { id: "p11", name: "A2", installedCapacity: 800, assignedCapacity: 200, consumedCapacity: 180, reservedCapacity: 0, breakers: generateBreakers("p11") },
            { id: "p12", name: "B2", installedCapacity: 800, assignedCapacity: 100, consumedCapacity: 90, reservedCapacity: 200, breakers: generateBreakers("p12") }
        ]
    }
];

export const RAW_MQTT_MOCK: MQTTPayload[] = [
    {
        msgid: "75355",
        method: "update",
        sn: "25110703400009",
        timestamp: 1775489710,
        reported: {
            "0_1_1": {
                state: "ONLINE",
                U1: "13.88",
                U2: "0.00",
                I1: "42.0",
                I2: "0.00",
                P1: "0.58",
                P2: "0.00",
                EP1: "30.00",
                EP2: "0.00"
            }
        }
    }
];

// ==========================================
// TAPI & PHYSICAL INFRASTRUCTURE DATA MOCK
// ==========================================
import { TAPIArchitectureModel } from './types';
export const MOCK_INFRASTRUCTURE_DATA: TAPIArchitectureModel = {
    infrastructure: [
        {
            id: 'country-pe', name: 'Peru',
            regions: [
                {
                    id: 'reg-lima', name: 'Lima',
                    provinces: [
                        {
                            id: 'prov-lima', name: 'Lima',
                            towns: [
                                {
                                    id: 'town-lurin', name: 'Lurín',
                                    districts: [
                                        {
                                            id: 'dist-lurin', name: 'Lurín',
                                            sites: [
                                                {
                                                    id: 'site-tx', name: 'Lurín Landing Station',
                                                    structures: [
                                                        {
                                                            id: 'str-main', name: 'Main Building',
                                                            levels: [
                                                                {
                                                                    id: 'lvl-1', name: 'Floor 1',
                                                                    substructures: [
                                                                        {
                                                                            id: 'room-tx-1', name: 'SALA 01',
                                                                            rows: [
                                                                                {
                                                                                    id: 'row-b', name: 'Row B',
                                                                                    positions: [
                                                                                        {
                                                                                            id: 'pos-b12', name: 'B-12',
                                                                                            containers: [
                                                                                                {
                                                                                                    id: 'rack-bdfb', name: 'Rack BDFB',
                                                                                                    containerSpaces: [
                                                                                                        {
                                                                                                            id: 'cspace-full', name: 'Full Rack',
                                                                                                            devices: [
                                                                                                                {
                                                                                                                    id: 'dev-planta-rect',
                                                                                                                    name: 'PLANTA RECTIFICADORA',
                                                                                                                    category: 'POWER_SYSTEM',
                                                                                                                    equipments: [
                                                                                                                        {
                                                                                                                            id: 'eq-plant-chassis', name: 'Chassis Principal', category: 'SHELF',
                                                                                                                            children: [
                                                                                                                                {
                                                                                                                                    id: 'eq-batt-bank', name: 'Banco de Baterías', category: 'SUBSHELF',
                                                                                                                                    ports: [
                                                                                                                                        { id: 'prt-batt-vdc-pos', name: 'VDC (+)', type: 'POWER_SUPPLY', role: 'OUTPUT' },
                                                                                                                                        { id: 'prt-batt-vdc-neg', name: 'VDC (-)', type: 'POWER_SUPPLY', role: 'OUTPUT' }
                                                                                                                                    ]
                                                                                                                                },
                                                                                                                                {
                                                                                                                                    id: 'eq-rect-module', name: 'Rectificador Module', category: 'POWER_SUPPLY',
                                                                                                                                    ports: [
                                                                                                                                        { id: 'prt-rect-out-pos', name: 'OUT (+)', type: 'POWER_SUPPLY', role: 'OUTPUT' },
                                                                                                                                        { id: 'prt-rect-out-neg', name: 'OUT (-)', type: 'POWER_SUPPLY', role: 'OUTPUT' }
                                                                                                                                    ]
                                                                                                                                }
                                                                                                                            ]
                                                                                                                        }
                                                                                                                    ],
                                                                                                                    ports: []
                                                                                                                },
                                                                                                                {
                                                                                                                    id: 'dev-bdfb-dist',
                                                                                                                    name: 'BDFB DISTRIBUTION',
                                                                                                                    category: 'POWER_DISTRIBUTION',
                                                                                                                    equipments: [
                                                                                                                        {
                                                                                                                            id: 'eq-bdfb-chassis', name: 'BDFB Chassis (Config 5)', category: 'SHELF',
                                                                                                                            children: [
                                                                                                                                {
                                                                                                                                    id: 'eq-bdfb-input', name: 'Input Links', category: 'SUBSHELF',
                                                                                                                                    ports: [
                                                                                                                                        { id: 'prt-bdfb-in-pos', name: 'INPUT (+)', type: 'POWER_SUPPLY', role: 'INPUT' },
                                                                                                                                        { id: 'prt-bdfb-in-neg', name: 'INPUT (-)', type: 'POWER_SUPPLY', role: 'INPUT' }
                                                                                                                                    ]
                                                                                                                                },
                                                                                                                                {
                                                                                                                                    id: 'eq-bdfb-panela1', name: 'Breaker Panel A1', category: 'CIRCUIT_BREAKER_PANEL',
                                                                                                                                    ports: [
                                                                                                                                        { id: 'prt-bdfb-a1-p1', name: 'Pos 1 (-)', type: 'POWER_DIST', role: 'OUTPUT' },
                                                                                                                                        { id: 'prt-bdfb-a1-p2', name: 'Pos 2 (-)', type: 'POWER_DIST', role: 'OUTPUT' },
                                                                                                                                        { id: 'prt-bdfb-a1-p3', name: 'Pos 3 (-)', type: 'POWER_DIST', role: 'OUTPUT' }
                                                                                                                                    ]
                                                                                                                                },
                                                                                                                                {
                                                                                                                                    id: 'eq-bdfb-panelb1', name: 'Breaker Panel B1', category: 'CIRCUIT_BREAKER_PANEL',
                                                                                                                                    ports: [
                                                                                                                                        { id: 'prt-bdfb-b1-p1', name: 'Pos 1 (-)', type: 'POWER_DIST', role: 'OUTPUT' },
                                                                                                                                        { id: 'prt-bdfb-b1-p2', name: 'Pos 2 (-)', type: 'POWER_DIST', role: 'OUTPUT' },
                                                                                                                                        { id: 'prt-bdfb-b1-p3', name: 'Pos 3 (-)', type: 'POWER_DIST', role: 'OUTPUT' }
                                                                                                                                    ]
                                                                                                                                }
                                                                                                                            ]
                                                                                                                        }
                                                                                                                    ],
                                                                                                                    ports: []
                                                                                                                }
                                                                                                            ]
                                                                                                        }
                                                                                                    ]
                                                                                                }
                                                                                            ]
                                                                                        },
                                                                                        {
                                                                                            id: 'pos-a04', name: 'A-04',
                                                                                            containers: [
                                                                                                {
                                                                                                    id: 'rack-router', name: 'Rack Router Core',
                                                                                                    containerSpaces: [
                                                                                                        {
                                                                                                            id: 'cspace-router', name: 'U10-U25',
                                                                                                            devices: [
                                                                                                                {
                                                                                                                    id: 'dev-client-router', name: 'CLIENT ROUTER', category: 'NETWORKING',
                                                                                                                    equipments: [
                                                                                                                        {
                                                                                                                            id: 'eq-router-chassis', name: 'CISCO ASR 9000 Chassis', category: 'SHELF',
                                                                                                                            children: [
                                                                                                                                {
                                                                                                                                    id: 'eq-router-psu', name: 'Power Supply Bay A', category: 'POWER_SUPPLY',
                                                                                                                                    ports: [
                                                                                                                                        { id: 'prt-router-pem1', name: 'PEM 1 In', type: 'POWER_SUPPLY', role: 'INPUT' },
                                                                                                                                        { id: 'prt-router-eth0', name: 'ETH 0/1', type: 'DATA', role: 'INPUT' }
                                                                                                                                    ]
                                                                                                                                }
                                                                                                                            ]
                                                                                                                        }
                                                                                                                    ],
                                                                                                                    ports: []
                                                                                                                }
                                                                                                            ]
                                                                                                        }
                                                                                                    ]
                                                                                                }
                                                                                            ]
                                                                                        }
                                                                                    ]
                                                                                }
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    connections: [
        { id: 'conn-1', sourceNodeId: 'prt-batt-vdc-pos', targetNodeId: 'prt-bdfb-in-pos', type: 'electrical_power' },
        { id: 'conn-2', sourceNodeId: 'prt-batt-vdc-neg', targetNodeId: 'prt-bdfb-in-neg', type: 'electrical_power' },
        { id: 'conn-3', sourceNodeId: 'prt-rect-out-pos', targetNodeId: 'prt-bdfb-in-pos', type: 'electrical_power' },
        { id: 'conn-4', sourceNodeId: 'prt-rect-out-neg', targetNodeId: 'prt-bdfb-in-neg', type: 'electrical_power' },
        { id: 'conn-5', sourceNodeId: 'prt-bdfb-b1-p1', targetNodeId: 'prt-router-pem1', type: 'electrical_power' }
    ]
};