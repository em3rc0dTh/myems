// --- HIERARCHICAL MODELS (SITE > ROOM > POSITION > DEVICE) ---

export interface Substructure {
  id: string;
  name: string; // SALA TX-01
  type: string; // ROOM
  gridRows: string[]; // ["A", "B", ... "J"]
  gridCols: number[]; // [1, 2, ... 20]
  siteName?: string; // AppM EMS Site A
  buildingName?: string; // Building 01
  perimeter?: string; // JSON: [[x,y], ...]
  referencePoints?: string; // JSON: [{x,y,label,type}, ...]
}

export interface Position {
  id: string;
  substructureId: string;
  row: string;
  col: number;
  widthUnits: number;
  depthUnits: number;
  status: 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'ERROR' | 'WARNING';
  label?: string;
  deviceId?: string; // If occupied, which device?
  fedBy?: string; // ID of the PDU/BDFB that provides power to this tile
  physWidthCm?: number;
  physDepthCm?: number;
  physOffsetX?: number;
  physOffsetY?: number;
}

// --- EXISTING UI MODELS ---

export interface BreakerData {
  id: string;
  position: number;
  status: 'occupied' | 'empty';
  label?: string;
  voltage?: string;
  current?: string;
  power?: string;
  energy?: string;
  online?: boolean;
}

export interface PanelData {
  id: string;
  name: string; // A1, A2, B1, B2
  installedCapacity: number; // 800A
  assignedCapacity: number;
  consumedCapacity: number;
  reservedCapacity: number;
  logicalPrefix?: string; // Prefix for logical port IDs (e.g. "0_1_")
  breakers?: BreakerData[];
}

export interface HistoryPoint {
  avg: number;
  max: number;
  min: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TelemetryData {
  voltage: number;
  voltageHistory: HistoryPoint;
  current: number;
  currentHistory: HistoryPoint;
  power: number;
  powerHistory: HistoryPoint;
  energy: number;
  energyHistory: HistoryPoint;
}

export interface HistoryDataPoint {
  time: string;
  voltage: number;
  current: number;
  power: number;
}

export interface ConnectionMapData {
  id: string;
  port: string;
  panelName: string;
  position: number;
  status: 'Activo' | 'Reservado' | 'Off';
  clientName?: string; // Name of the connected NE
  meterPort?: string; // Label for the metering port
}

export interface MQTTReportedValue {
  state: string;
  U1?: string;
  U2?: string;
  I1?: string;
  I2?: string;
  P1?: string;
  P2?: string;
  EP1?: string;
  EP2?: string;
}

export interface MQTTPayload {
  msgid: string;
  method: string;
  sn: string;
  timestamp: number;
  reported: Record<string, MQTTReportedValue>;
}

export interface BDFBData {
  id: string;
  sn?: string; 
  name: string;
  location: string;
  panels: PanelData[];
  telemetry?: TelemetryData;
  connections?: ConnectionMapData[];
  telemetryHistory?: HistoryDataPoint[];
  substructureId?: string;
  equipments?: TAPIEquipment[];
}

export function getBDFBSummary(bdfb: BDFBData) {
  const installed = bdfb.panels.reduce((acc, p) => acc + p.installedCapacity, 0);
  const assigned = bdfb.panels.reduce((acc, p) => acc + p.assignedCapacity, 0);
  const consumed = bdfb.panels.reduce((acc, p) => acc + p.consumedCapacity, 0);
  const reserved = bdfb.panels.reduce((acc, p) => acc + p.reservedCapacity, 0);
  const vacant = installed - (assigned + reserved);

  return {
    installed,
    consumed,
    reserved,
    vacant,
    assigned
  };
}
// ==========================================
// TAPI & PHYSICAL INFRASTRUCTURE DATA MODEL
// ==========================================

export type EquipmentCategory = 
  | 'SHELF' 
  | 'SUBSHELF' 
  | 'CIRCUIT_PACK' 
  | 'CIRCUIT_BREAKER_PANEL'
  | 'MODULE_SFP' 
  | 'BREAKER' 
  | 'POWER_SUPPLY';

export interface TAPIPort {
    id: string;
    name: string;
    type: 'POWER_SUPPLY' | 'POWER_DIST' | 'DATA' | 'TELEMETRY';
    role: 'INPUT' | 'OUTPUT';
    maxAmperage?: number;
    cableGauge?: string;
    sensorKey?: string;
}

export interface TAPIEquipment {
    id: string;
    name: string;
    category: EquipmentCategory;
    sn?: string;
    logicalPrefix?: string;
    children?: TAPIEquipment[];
    ports?: TAPIPort[];
    holders?: TAPIHolder[];
}

export interface TAPIHolder {
    id: string;
    name: string;
    location?: string;
    occupiedBy?: TAPIEquipment;
}

export interface TAPIDevice {
    id: string;
    name: string;
    category: string;
    sn?: string;
    equipments: TAPIEquipment[];
    ports: TAPIPort[];
}

export interface TAPIContainerSpaceAssigned {
    id: string;
    name: string;
    devices: TAPIDevice[];
}

export interface TAPIContainer {
    id: string;
    name: string;
    containerSpaces: TAPIContainerSpaceAssigned[];
}

export interface TAPIPosition {
    id: string;
    name: string;
    containers: TAPIContainer[];
}

export interface TAPIRow {
    id: string;
    name: string;
    positions: TAPIPosition[];
}

export interface TAPISubstructure {
    id: string;
    name: string;
    rows: TAPIRow[];
}

export interface TAPILevel {
    id: string;
    name: string;
    substructures: TAPISubstructure[];
}

export interface TAPIStructure {
    id: string;
    name: string;
    levels: TAPILevel[];
}

export interface TAPISite {
    id: string;
    name: string;
    structures: TAPIStructure[];
}

export interface TAPIDistrict {
    id: string;
    name: string;
    sites: TAPISite[];
}

export interface TAPITown {
    id: string;
    name: string;
    districts: TAPIDistrict[];
}

export interface TAPIProvince {
    id: string;
    name: string;
    towns: TAPITown[];
}

export interface TAPIRegion {
    id: string;
    name: string;
    provinces: TAPIProvince[];
}

export interface TAPICountry {
    id: string;
    name: string;
    regions: TAPIRegion[];
}

export interface TAPIConnection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    type: 'electrical_power' | 'data' | 'optical';
}

export interface TAPIArchitectureModel {
    infrastructure: TAPICountry[];
    connections: TAPIConnection[];
}
