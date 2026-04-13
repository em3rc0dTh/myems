"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import RackElevation from "@/components/RackElevation";

const BASE = "/telxius";
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Site { id: string; name: string; address: string | null; }
interface Structure { id: string; name: string; }
interface Level { id: string; name: string; }
interface Substructure { id: string; name: string; gridRows: string[]; gridCols: number[]; }
interface Position {
  id: string; row: string; col: number;
  widthUnits: number; depthUnits: number;
  physWidthCm: number; physDepthCm: number;
  status: "EMPTY" | "OCCUPIED" | "RESERVED";
  label: string | null; deviceId: string | null;
}

interface Equipment {
  id: string; name: string; category: string; slotLabel: string | null;
  unitPosition: number | null; unitHeight: number | null;
  logicalPrefix: string | null;
  deviceId: string; parentEquipmentId: string | null; children: Equipment[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  EMPTY:    { bg: "rgba(100,116,139,.1)", color: "#475569", label: "Vacía" },
  OCCUPIED: { bg: "rgba(99,102,241,.12)",  color: "#818cf8", label: "Ocupada" },
  RESERVED: { bg: "rgba(245,158,11,.1)",  color: "#fbbf24", label: "Reservada" },
};

const CATEGORY_COLORS: Record<string, string> = {
  RACK: "#2563eb",             // Azul Eléctrico (Contenedor)
  SUBRACK: "#10b981",          // Esmeralda (Chasis)
  PANEL: "#f59e0b",            // Ámbar (Distribución)
  BREAKER: "#f43f5e",          // Carmesí (Punto de Corte)
  CIRCUIT_PACK: "#8b5cf6",     // Violeta
  NETWORKING: "#3b82f6",       // Blue
};

// ─── Componentes ──────────────────────────────────────────────────────────────

function EquipmentItem({ item, deviceId, onReload, telemetry, parentRU, parentPrefix }: { 
  item: Equipment; 
  deviceId: string; 
  onReload: () => void; 
  telemetry?: Record<string, { v?: number; a?: number; w?: number }>; 
  parentRU?: { pos: number; h: number }; 
  parentPrefix?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Sugerencia de categoría basada en jerarquía
  const getNextCategory = (cat: string) => {
    if (cat === "RACK") return "SUBRACK";
    if (cat === "SUBRACK") return "PANEL";
    if (cat === "PANEL") return "BREAKER";
    return "SUBRACK";
  };

  const [form, setForm] = useState({ name: "", category: getNextCategory(item.category), slotLabel: "", logicalPrefix: "" });
  const [editForm, setEditForm] = useState({ name: item.name, category: item.category, slotLabel: item.slotLabel || "", logicalPrefix: item.logicalPrefix || "" });

  const addChild = async () => {
    if (!form.name) return;
    await api("/api/equipments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, deviceId, parentEquipmentId: item.id }),
    });
    setAddingChild(false); onReload();
  };

  const saveEdit = async () => {
    await api(`/api/equipments?id=${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    setIsEditing(false); onReload();
  };

  const updateRU = useCallback(async (field: string, val: number) => {
    // Validación jerárquica de límites
    const newPos = field === "unitPosition" ? val : (item.unitPosition || 0);
    const newHeight = field === "unitHeight" ? val : (item.unitHeight || 1);

    if (parentRU && (newPos > 0)) {
      const parentMax = parentRU.pos + parentRU.h - 1;
      const childMax = newPos + newHeight - 1;
      if (newPos < parentRU.pos) return alert(`Error: El equipo debe iniciar dentro del rango del padre (Mínimo U${parentRU.pos})`);
      if (childMax > parentMax) return alert(`Error: El equipo excede el límite superior del padre (Máximo U${parentMax})`);
    }

    await api(`/api/equipments?id=${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: Number(val) })
    });
    onReload();
  }, [item.id, onReload, item.unitPosition, item.unitHeight, parentRU]);

  const [showPorts, setShowPorts] = useState(false);
  const [ports, setPorts] = useState<any[]>([]);
  const loadPorts = useCallback(async () => {
    const r = await api(`/api/ports?equipmentId=${item.id}`);
    if (r.ok) setPorts(r.data);
  }, [item.id]);

  useEffect(() => { if (showPorts) loadPorts(); }, [showPorts, loadPorts]);

  const addPort = async () => {
    const name = prompt("Nombre Puerto:"); if(!name) return;
    let defaultTopic = "";
    if (parentPrefix) {
        defaultTopic = `${parentPrefix}${item.slotLabel || ""}`;
    }
    const topic = prompt("Tópico MQTT / ID Lógico:", defaultTopic);
    await api("/api/ports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, deviceId, equipmentId: item.id, type: "POWER_OUT", sensorTopic: topic })
    });
    loadPorts();
  };

  const updatePort = async (id: string, field: string, val: string) => {
     await api(`/api/ports?id=${id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({[field]: val}) });
     loadPorts();
  };

  const [localRU, setLocalRU] = useState<{ pos: string | number; h: string | number }>({ 
    pos: item.unitPosition || "", 
    h: item.unitHeight || 1 
  });

  useEffect(() => {
    setLocalRU({ pos: item.unitPosition || "", h: item.unitHeight || 1 });
  }, [item.unitPosition, item.unitHeight]);

  const handleRUBlur = (field: "pos" | "h", val: string) => {
    const num = Number(val);
    const newPos = field === "pos" ? num : (Number(localRU.pos) || 0);
    const newH = field === "h" ? num : (Number(localRU.h) || 1);

    if (parentRU && newPos > 0) {
      const parentMax = parentRU.pos + parentRU.h - 1;
      const childMax = newPos + newH - 1;
      if (newPos < parentRU.pos || childMax > parentMax) {
         alert(`Error: Debe estar contenido en el padre (U${parentRU.pos} - U${parentMax})`);
         setLocalRU({ pos: item.unitPosition || "", h: item.unitHeight || 1 });
         return;
      }
    }
    updateRU(field === "pos" ? "unitPosition" : "unitHeight", num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  };

  return (
    <div className="eq-module-wrapper">
      <div className={`eq-module-card ${expanded ? "expanded" : ""}`} style={{ borderLeftColor: CATEGORY_COLORS[item.category] || "#444" }}>
        
        <div className="module-main">
          <div className="module-top">
            <button className={`module-toggle ${expanded ? "expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
              {item.children?.length > 0 ? "▾" : "○"}
            </button>
            <div className="module-identity">
              {isEditing ? (
                <div className="module-edit-box">
                  <input className="edit-input name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  <select className="edit-select" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                    {["RACK","SUBRACK","PANEL","BREAKER","CIRCUIT_PACK","NETWORKING"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="edit-input slot" placeholder="Slot" value={editForm.slotLabel} onChange={e => setEditForm({...editForm, slotLabel: e.target.value})} />
                  {item.category === "PANEL" && (
                    <input className="edit-input prefix" placeholder="Pfx: 0_1_" value={editForm.logicalPrefix} onChange={e => setEditForm({...editForm, logicalPrefix: e.target.value})} title="Prefijo Lógico (ej: 0_1_)" />
                  )}
                  <button className="btn-save-mini" onClick={saveEdit}>💾</button>
                  <button className="btn-cancel-mini" onClick={() => setIsEditing(false)}>✕</button>
                </div>
              ) : (
                <div className="module-identity-view" onClick={() => setIsEditing(true)} title="Click para editar">
                  <span className="module-name">{item.name}</span>
                  <span className="module-badge">{item.category}</span>
                  {item.slotLabel && <span className="slot-badge">Slot {item.slotLabel}</span>}
                  {item.logicalPrefix && <span className="prefix-badge" title="Prefijo Lógico">{item.logicalPrefix}</span>}
                </div>
              )}
            </div>
            
            <div className="module-ru-controls" onClick={e => e.stopPropagation()}>
              <div className="ru-pill">
                <span>POS</span>
                <input 
                  type="number" 
                  value={localRU.pos.toString()} 
                  onChange={e => setLocalRU({...localRU, pos: e.target.value})}
                  onBlur={e => handleRUBlur("pos", e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="ru-pill">
                <span>H</span>
                <input 
                  type="number" 
                  value={localRU.h.toString()} 
                  onChange={e => setLocalRU({...localRU, h: e.target.value})}
                  onBlur={e => handleRUBlur("h", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.target as any).blur()}
                />
              </div>
            </div>
          </div>

          <div className="module-actions">
            <button className={`act-btn ${showPorts ? "active" : ""}`} title="Puertos" onClick={() => setShowPorts(!showPorts)}>🔌</button>
            <button className="act-btn" title="Hijo" onClick={() => {setAddingChild(true); setExpanded(true);}}>＋</button>
            <button className="act-btn del" title="Borrar" onClick={async ()=>{if(!confirm("Eliminar?"))return; await api(`/api/equipments?id=${item.id}`,{method:"DELETE"}); onReload();}}>🗑️</button>
          </div>
        </div>
      </div>

      {showPorts && (
        <div className="eq-ports-panel">
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:"0.5rem"}}>
            <span style={{fontSize:".6rem", fontWeight:700, color:"#94a3b8"}}>PUERTOS</span>
            <button className="btn-add-mini" onClick={addPort}>+ Añadir</button>
          </div>
          {ports.map((p) => (
            <div key={p.id} className="port-item-col">
              <div className="port-item">
                <div style={{display:"flex", alignItems:"center", gap:"6px"}}>
                  <span style={{color: p.sensorTopic ? "#34d399" : "#475569", animation: p.sensorTopic ? "pulse 2s infinite" : "none"}}>●</span>
                  <span>{p.name} <small style={{opacity:0.5}}>{p.type}</small></span>
                </div>
                <div className="port-acts">
                  <input className="mini-topic-input" placeholder="Tópico MQTT" value={p.sensorTopic || ""} onChange={e => updatePort(p.id, "sensorTopic", e.target.value)} />
                  {telemetry?.[p.sensorTopic || ""] && (
                    <div className="port-telemetry">
                      <span className="tele-v" title="Voltaje">{telemetry[p.sensorTopic!].v?.toFixed(1)}V</span>
                      <span className="tele-a" title="Corriente">{telemetry[p.sensorTopic!].a?.toFixed(2)}A</span>
                      <span className="tele-w" title="Potencia">{telemetry[p.sensorTopic!].w?.toFixed(0)}W</span>
                    </div>
                  )}
                  <button className="btn-conn-mini" onClick={() => {
                     const tid = prompt("ID Puerto Destino:"); if(!tid) return;
                     api("/api/connections", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({sourcePortId: p.id, targetPortId: tid}) }).then(loadPorts);
                  }}>🔗</button>
                </div>
              </div>

              {(p.sourceConnections?.length > 0 || p.targetConnections?.length > 0) && (
                <div className="port-conns-row">
                  {p.sourceConnections?.map(c => <span key={c.id}>→ {c.targetPort?.equipment?.name || "NE"}</span>)}
                  {p.targetConnections?.map(c => <span key={c.id}>← {c.sourcePort?.equipment?.name || "SRC"}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {expanded && (
        <div className="module-nested-container">
          <div className="tree-linking-guide" />
          <div className="nested-content">
            {item.children?.map(c => (
              <EquipmentItem 
                key={c.id} 
                item={c} 
                deviceId={deviceId} 
                onReload={onReload} 
                telemetry={telemetry} 
                parentRU={{ pos: item.unitPosition || 1, h: item.unitHeight || 1 }} 
                parentPrefix={item.category === "PANEL" ? item.logicalPrefix : parentPrefix}
              />
            ))}
            {addingChild && (
              <div className="add-module-form">
                <input placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                   {["RACK","SUBRACK","PANEL","BREAKER","CIRCUIT_PACK","NETWORKING"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Slot" value={form.slotLabel} onChange={e => setForm({...form, slotLabel: e.target.value})} />
                <div className="form-acts"><button onClick={() => setAddingChild(false)}>X</button><button onClick={addChild}>OK</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HardwareModal({ device, onClose }: { device: any; onClose: () => void }) {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<Record<string, any>>({});

  const loadEq = useCallback(async (devId: string) => {
    setLoading(true);
    const r = await api(`/api/equipments?deviceId=${devId}`);
    if (r.ok) {
      const map = new Map<string, Equipment>();
      r.data.forEach((e: any) => map.set(e.id, { ...e, children: [] }));
      const roots: Equipment[] = [];
      r.data.forEach((e: any) => {
        if (e.parentEquipmentId) map.get(e.parentEquipmentId)?.children.push(map.get(e.id)!);
        else roots.push(map.get(e.id)!);
      });
      setEquipments(roots);
    }
    setLoading(false);
  }, []);

  const fetchTelemetry = useCallback(async () => {
    // Polling simplificado para todos los puertos del dispositivo
    const rPorts = await api(`/api/ports?deviceId=${device.id}`);
    if (rPorts.ok) {
      const topics = rPorts.data.filter((p: any) => p.sensorTopic).map((p: any) => p.sensorTopic);
      for (const t of topics) {
        const rTel = await api(`/api/telemetry?topic=${t}`);
        if (rTel.ok) setTelemetry(prev => ({ ...prev, [t]: rTel.data.values }));
      }
    }
  }, [device.id]);

  useEffect(() => {
    loadEq(device.id);
    fetchTelemetry();
    const iv = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(iv);
  }, [device.id, loadEq, fetchTelemetry]);

  const flattenEquipments = (items: Equipment[]): Equipment[] => {
    let res: Equipment[] = [];
    items.forEach(i => {
      res.push(i);
      if (i.children?.length > 0) res = res.concat(flattenEquipments(i.children));
    });
    return res;
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="modal-title">
            <span>Gestión de Hardware: <strong>{device.name}</strong></span>
            <span className="dev-category-pill">{device.category}</span>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body-split">
          <div className="pane-inventory">
            <div className="pane-hd">⛓️ Árbol de Equipos y Puertos</div>
            {loading ? (
              <div className="loading-state">Cargando inventario...</div>
            ) : (
              <div className="tree-scroll">
                {equipments.map(eq => (
                  <EquipmentItem 
                    key={eq.id} 
                    item={eq} 
                    deviceId={device.id} 
                    onReload={() => loadEq(device.id)} 
                    telemetry={telemetry} 
                  />
                ))}
                <button className="btn-add-root" onClick={async () => {
                  const name = prompt("Nombre:"); if (!name) return;
                  await api("/api/equipments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, category: "SUBRACK", deviceId: device.id }) });
                  loadEq(device.id);
                }}>+ Añadir Equipo Externo</button>
              </div>
            )}
          </div>
          
          <div className="pane-elevation">
            <div className="pane-hd">📏 Elevación Frontal RU</div>
            <div className="elev-scroll">
              <RackElevation equipments={flattenEquipments(equipments)} onSelect={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PosDetail({ pos, room, onUpdate, onClose, siteId }: { pos: Position; room: Substructure; onUpdate: any; onClose: any; siteId: string; }) {
  const [f, setF] = useState({ ...pos, label: pos.label || "" });
  const [device, setDevice] = useState<any>(null);
  const [showHW, setShowHW] = useState(false);

  useEffect(() => {
    setF({ ...pos, label: pos.label || "" });
    if (pos.deviceId) {
      api(`/api/devices?siteId=${siteId}`).then(r => {
        const d = r.data?.find((x: any) => x.id === pos.deviceId);
        setDevice(d);
      });
    } else {
      setDevice(null);
    }
  }, [pos, siteId]);

  const save = () => {
    const ri = room.gridRows.indexOf(f.row);
    const ci = room.gridCols.indexOf(f.col);
    if (ci + f.widthUnits > room.gridCols.length) return alert("Excede borde derecho");
    if (ri + f.depthUnits > room.gridRows.length) return alert("Excede borde inferior");
    onUpdate(pos.id, f).then(onClose);
  };

  const deletePos = async () => {
    if (!confirm("¿Eliminar posición?")) return;
    await api(`/api/positions?id=${pos.id}`, { method: "DELETE" });
    onClose();
  };

  return (
    <div className="detail-panel">
      <div className="detail-hd"><span>Posición <strong>{pos.row}{pos.col}</strong></span><button onClick={onClose}>✕</button></div>
      <div className="form-group"><label>Etiqueta</label><input className="form-input" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} /></div>
      <div className="form-group">
        <label>Estado</label>
        <select className="form-input" value={f.status} onChange={e => setF({ ...f, status: e.target.value as any })}>
          <option value="EMPTY">Vacía</option><option value="OCCUPIED">Ocupada</option><option value="RESERVED">Reservada</option>
        </select>
      </div>
      <div className="section-divider">📏 Dimensiones Físicas (cm)</div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}><label>Ancho</label><input className="form-input" type="number" value={f.physWidthCm} onChange={e => { const v = Number(e.target.value); setF({ ...f, physWidthCm: v, widthUnits: Math.ceil(v / 60) }) }} /></div>
        <div className="form-group" style={{ flex: 1 }}><label>Prof.</label><input className="form-input" type="number" value={f.physDepthCm} onChange={e => { const v = Number(e.target.value); setF({ ...f, physDepthCm: v, depthUnits: Math.ceil(v / 60) }) }} /></div>
      </div>
      <div style={{ fontSize: ".7rem", color: "#64748b", marginBottom: "1rem" }}>Tiles: {f.widthUnits}x{f.depthUnits}</div>
      
      <div style={{display:"flex", gap:"8px"}}>
        <button className="btn-primary" style={{ flex: 2 }} onClick={save}>💾 Guardar Cambios</button>
        <button className="btn-ico danger" style={{ flex: 1, background:"rgba(248,113,113,0.1)" }} onClick={deletePos}>🗑️</button>
      </div>

      <div className="section-divider" style={{ marginTop: "2rem" }}>⛓️ Inventario Técnico</div>
      {!device ? (
        <button className="btn-ghost-sm" onClick={async () => {
          const name = prompt("Nombre del Dispositivo:"); if (!name) return;
          await api("/api/devices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, siteId, positionIds: [pos.id], category: "BDFB" }) });
          onClose();
        }}>+ Instalar Dispositivo</button>
      ) : (
        <div className="device-brief">
          <div className="dev-info"><strong>{device.name}</strong><span className="dev-category-pill">{device.category}</span></div>
          <button className="btn-manage-hw" onClick={() => setShowHW(true)}>⚙️ Gestionar Hardware</button>
          {showHW && <HardwareModal device={device} onClose={() => setShowHW(false)} />}
        </div>
      )}
    </div>
  );
}

// ─── Floor Plan (FIXED SPANNING) ──────────────────────────────────────────────
function FloorPlan({ room, positions, onSelectPos, onOpenCreate }: { room: Substructure; positions: Position[]; onSelectPos: any; onOpenCreate: any; }) {
  const occupiedBySpan = new Set<string>();
  const positionsByOrigin = new Map<string, Position>();

  positions.forEach(p => {
    positionsByOrigin.set(`${p.row}-${p.col}`, p);
    const ri = room.gridRows.indexOf(p.row);
    const ci = room.gridCols.indexOf(p.col);
    for (let r = 0; r < p.depthUnits; r++) {
      for (let c = 0; c < p.widthUnits; c++) {
        if (r === 0 && c === 0) continue;
        const rl = room.gridRows[ri + r];
        const cv = room.gridCols[ci + c];
        if (rl && cv !== undefined) occupiedBySpan.add(`${rl}-${cv}`);
      }
    }
  });

  return (
    <div className="floorplan-wrap">
      <div className="floorplan-title">📐 Plano: <strong>{room.name}</strong></div>
      <div className="floorplan-grid" style={{ gridTemplateColumns: `42px repeat(${room.gridCols.length}, 1fr)` }}>
        <div className="cell header-cell" />
        {room.gridCols.map(col => <div key={col} className="cell header-cell">{col}</div>)}
        {room.gridRows.map(row => (
          <React.Fragment key={row}>
            <div className="cell header-cell">{row}</div>
            {room.gridCols.map(col => {
              const id = `${row}-${col}`;
              
              // CRÍTICO: Si la celda está ocupada por un spanning, NO PINTAR NADA.
              // El CSS Grid colocará automáticamente el siguiente elemento en el siguiente slot libre.
              if (occupiedBySpan.has(id)) return null;

              const p = positionsByOrigin.get(id);
              const st = p ? STATUS_STYLE[p.status] : null;
              
              const cellStyle: any = p ? {
                gridColumn: `span ${p.widthUnits}`,
                gridRow: `span ${p.depthUnits}`,
                background: st!.bg, borderColor: st!.color,
                height: `${p.depthUnits * 64 - 4}px`, position: "relative"
              } : {};

              return (
                <div key={id} className={`cell data-cell ${p ? "has-pos" : "no-pos"}`} 
                     style={cellStyle} 
                     onClick={() => p ? onSelectPos(p) : onOpenCreate(row, col)}>
                  {p ? (
                    <>
                      <div className="phys-box" style={{
                        width: `${(p.physWidthCm / (p.widthUnits * 60)) * 100}%`,
                        height: `${(p.physDepthCm / (p.depthUnits * 60)) * 100}%`,
                        borderColor: st!.color, background: `linear-gradient(135deg, ${st!.color}33, ${st!.color}11)`
                      }}><span className="phys-label">{p.physWidthCm}×{p.physDepthCm}</span></div>
                      <span className="pos-id-tag">{row}{col}</span>
                      <span className="pos-label-tag">{p.label}</span>
                    </>
                  ) : <div className="empty-dot" />}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function PositionsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [rooms, setRooms] = useState<Substructure[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [room, setRoom] = useState<Substructure | null>(null);
  const [selPos, setSelPos] = useState<Position | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ row:"A", col:1, label:"", physWidthCm:60, physDepthCm:60, widthUnits:1, depthUnits:1 });

  useEffect(() => {
    api("/api/geo").then(r => {
      if(!r.ok) return;
      const all = r.data.flatMap((c:any)=>c.regions.flatMap((rg:any)=>rg.provinces.flatMap((p:any)=>p.cities.flatMap((ci:any)=>ci.districts.flatMap((d:any)=>d.sites)))));
      setSites(all);
    });
  }, []);

  const loadPos = (rid: string) => api(`/api/positions?substructureId=${rid}`).then(r => r.ok && setPositions(r.data));

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#08080c;color:#e2e8f0;font-family:Inter,sans-serif}
        .page{padding:2rem;min-height:100vh}
        .layout{display:grid;grid-template-columns:260px 1fr 340px;gap:2rem;margin-top:1.5rem}

        .nav-panel{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:1rem;padding:1.25rem}
        .nav-title{font-size:.65rem;text-transform:uppercase;color:#475569;margin:1rem 0 .4rem 0;letter-spacing:.1em}
        
        /* NEW MODULAR INVENTORY STYLES */
        .eq-module-wrapper { margin-bottom: 0.5rem; position: relative; }
        .eq-module-card { background: #111111; border: 1px solid #222; border-radius: 8px; padding: 10px; transition: all 0.2s; position: relative; overflow: hidden; border-left: 4px solid #444; }
        .eq-module-card:hover { border-color: #333; background: #141414; }
        .eq-module-card.expanded { border-color: #333; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        
        .module-accent { display: none; }
        .module-main { flex: 1; display: flex; flex-direction: column; padding: 0.6rem 1rem; }
        .module-top { display: flex; align-items: center; gap: 12px; }
        .module-toggle { background: none; border: none; color: #64748b; cursor: pointer; padding: 0; font-size: 0.8rem; width: 16px; transition: transform 0.2s; }
        .module-toggle.expanded { transform: rotate(0deg); color: #6366f1; }
        .module-identity { flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .module-identity-view { display: flex; align-items: center; gap: 8px; width: 100%; }
        .module-edit-box { display: flex; gap: 4px; align-items: center; background: #000; padding: 2px 4px; border-radius: 4px; border: 1px solid #444; }
        .edit-input { background: transparent; border: none; color: #fff; font-size: 0.75rem; font-weight: 700; outline: none; }
        .edit-input.name { width: 100px; border-right: 1px solid #333; }
        .edit-input.slot { width: 50px; color: #34d399; }
        .edit-input.prefix { width: 80px; color: #818cf8; border-right: 1px solid #333; }
        .edit-select { background: #111; border: none; color: #94a3b8; font-size: 0.6rem; font-weight: 800; border-radius: 3px; cursor: pointer; }
        .btn-save-mini { background: none; border: none; cursor: pointer; font-size: 0.8rem; filter: grayscale(1); transition: filter 0.2s; }
        .btn-save-mini:hover { filter: grayscale(0); }
        .btn-cancel-mini { background: none; border: none; color: #f87171; cursor: pointer; font-size: 0.7rem; }

        .module-name { font-weight: 700; font-size: 0.75rem; color: #f1f5f9; }
        .module-badge { font-size: 0.55rem; color: #94a3b8; background: #1a1a1a; padding: 1px 6px; border-radius: 3px; font-weight: 800; border: 1px solid #222; text-transform: uppercase; }
        .slot-badge { font-size: 0.55rem; color: #34d399; font-weight: 700; background: rgba(52,211,153,0.1); padding: 1px 6px; border-radius: 3px; }
        .prefix-badge { font-size: 0.55rem; color: #818cf8; font-weight: 700; background: rgba(129,140,248,0.1); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(129,140,248,0.2); }

        .module-ru-controls { display: flex; gap: 6px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; border: 1px solid #222; }
        .ru-pill { display: flex; align-items: center; gap: 4px; }
        .ru-pill span { font-size: 0.5rem; color: #475569; font-weight: 800; }
        .ru-pill input { width: 24px; background: transparent; border: none; color: #6366f1; font-family: monospace; font-size: 0.7rem; font-weight: 800; text-align: center; }
        .ru-pill input:focus { outline: none; color: #fff; }

        .module-actions { display: flex; align-items: center; gap: 10px; margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px solid #1a1a1a; justify-content: flex-end; opacity: 0.1; transition: opacity 0.2s; }
        .eq-module-card:hover .module-actions { opacity: 1; }
        .act-btn { background: none; border: none; cursor: pointer; filter: grayscale(1); transition: transform 0.1s; display: flex; align-items: center; }
        .act-btn:hover { transform: scale(1.2); filter: grayscale(0); }
        .act-btn.active { filter: grayscale(0); transform: scale(1.1); }
        .act-btn.del:hover { color: #f87171; }

        /* NESTING GUIDES */
        .module-nested-container { display: flex; margin-left: 0.8rem; position: relative; margin-top: 4px; }
        .tree-linking-guide { width: 12px; border-left: 2px solid #222; border-bottom: 2px solid #222; border-radius: 0 0 0 8px; margin-right: 8px; margin-top: -12px; margin-bottom: 20px; }
        .nested-content { flex: 1; padding-top: 4px; }

        .add-module-form { display: flex; gap: 8px; background: #0c0c0c; padding: 0.8rem; border-radius: 0.5rem; border: 1px dashed #333; margin-top: 4px; }
        .add-module-form input { background: #000; border: 1px solid #222; color: #fff; font-size: 0.7rem; padding: 4px 8px; border-radius: 4px; width: 80px; }
        .form-acts { display: flex; gap: 4px; }
        .form-acts button { font-size: 0.6rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer; background: #222; color: #fff; border: 1px solid #333; }

        .nav-item{padding:.6rem;border-radius:.4rem;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:space-between;gap:8px}
        .nav-item:hover{background:rgba(255,255,255,.05)}
        .nav-item.active{background:rgba(99,102,241,.1);color:#a5b4fc;font-weight:600}
        .nav-item-actions{display:flex;gap:4px;opacity:0}
        .nav-item:hover .nav-item-actions{opacity:1}
        .nav-item-actions button{background:none;border:none;cursor:pointer;font-size:.7rem;padding:2px;border-radius:3px}
        .nav-item-actions button:hover{background:rgba(255,255,255,0.1)}

        .floorplan-wrap{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:1rem;padding:1.5rem}
        .floorplan-grid{display:grid;gap:4px}
        .cell{height:60px;border-radius:.4rem;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.03);position:relative}
        .header-cell{background:rgba(255,255,255,.04);color:#475569;font-weight:700;font-size:.7rem}
        .data-cell{cursor:pointer}
        .no-pos:hover{background:rgba(34,197,94,.05);border-color:rgba(34,197,94,.2)}
        .has-pos{border:1px solid;z-index:2}
        
        .phys-box{position:absolute;display:flex;align-items:center;justify-content:center;border:1px dashed;border-radius:2px}
        .phys-label{font-size:.5rem;font-weight:700}
        .pos-id-tag{position:absolute;top:4px;left:6px;font-size:.65rem;color:rgba(255,255,255,.2)}
        .pos-label-tag{position:absolute;bottom:4px;font-size:.6rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:90%;text-align:center}

        .detail-panel{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:1rem;padding:1.5rem}
        .detail-hd{display:flex;justify-content:space-between;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,.05);padding-bottom:.5rem}
        .section-divider{padding:.4rem;background:rgba(255,255,255,.03);font-size:.7rem;font-weight:700;margin:1.5rem 0 .8rem 0;border-radius:.4rem}
        .btn-ico{background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;padding:4px;border-radius:6px;transition:all .2s;display:flex;align-items:center;justify-content:center}
        .btn-port.active, .btn-port:hover{color:#a5b4fc;background:rgba(99,102,241,0.15)}
        .btn-add:hover{color:#34d399;background:rgba(52,211,153,0.1)}
        .btn-del:hover{color:#f87171;background:rgba(248,113,113,0.1)}

        .btn-primary-sm{background:#6366f1;border:none;color:#fff;padding:.3rem .8rem;border-radius:.4rem;cursor:pointer;font-size:.7rem}
        .btn-ghost-sm{width:100%;background:none;border:1px dashed #475569;color:#94a3b8;padding:.5rem;border-radius:.5rem;cursor:pointer}
        .back-btn{color:#a5b4fc;text-decoration:none;font-size:.8rem;background:rgba(99,102,241,.1);padding:.5rem 1rem;border-radius:.5rem}

        .tabs-mini { display: flex; gap: 4px; margin-bottom: 1rem; background: rgba(255,255,255,0.02); padding: 4px; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05); }
        .tab-m { flex: 1; background: none; border: none; color: #64748b; font-size: 0.7rem; padding: 0.4rem; border-radius: 0.4rem; cursor: pointer; transition: all 0.2s; font-weight: 500; }
        .tab-m.active { background: #6366f133; color: #a5b4fc; font-weight: 700; box-shadow: 0 0 10px rgba(99,102,241,0.2); }
        
        .eq-name-txt { font-weight: 700; color: #f1f5f9; font-size: 0.75rem; }
        .eq-badge { font-size: 0.55rem; color: #6366f1; background: rgba(99,102,241,0.1); padding: 1px 6px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.2); }
        .eq-name-row { display: flex; align-items: center; gap: 8px; }
        .eq-meta-row { display: flex; gap: 1rem; margin-top: 4px; align-items: center; }

        .ru-controls { display: flex; gap: 6px; }
        .ru-box { display: flex; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 0 4px; }
        .ru-box span { font-size: 0.5rem; color: #475569; font-weight: 800; margin-right: 4px; }
        .u-input { width: 28px; background: none; border: none; color: #fff; font-size: 0.65rem; padding: 2px 0; outline: none; font-family: monospace; text-align: center; }

        .eq-device-card { background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(0,0,0,0.5) 100%); padding: 1rem; border-radius: 0.8rem; border: 1px solid rgba(99,102,241,0.2); margin-bottom: 1.5rem; }
        .dev-info { display: flex; justify-content: space-between; align-items: center; }
        .dev-category-pill { font-size: 0.6rem; color: #a5b4fc; background: rgba(99,102,241,0.2); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(99,102,241,0.3); }

        .device-brief { background: rgba(99,102,241,0.05); padding: 1rem; border-radius: 0.8rem; border: 1px solid rgba(99,102,241,0.1); }
        .btn-manage-hw { width: 100%; margin-top: 1rem; background: #6366f1; border: none; color: #fff; padding: 0.6rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem; font-weight: 700; transition: all 0.2s; }
        .btn-manage-hw:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }

        /* MODAL XL FOR HARDWARE */
        .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 2rem; }
        .modal-xl { background: #0a0a0a; border: 1px solid #333; border-radius: 1.5rem; width: 100%; height: 100%; max-width: 1400px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.8); animation: modalIn 0.3s ease-out; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-hd { padding: 1.2rem 2rem; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; background: #111; }
        .modal-title { display: flex; align-items: center; gap: 12px; color: #f1f5f9; font-size: 1.1rem; }
        .btn-close { background: none; border: none; color: #64748b; font-size: 1.2rem; cursor: pointer; }
        .modal-body-split { flex: 1; display: flex; overflow: hidden; }
        .pane-inventory { flex: 1; border-right: 1px solid #222; padding: 2rem; display: flex; flex-direction: column; overflow: hidden; }
        .pane-elevation { width: 450px; background: #050505; padding: 2rem; display: flex; flex-direction: column; overflow: hidden; }
        .pane-hd { font-size: 0.8rem; font-weight: 800; color: #475569; margin-bottom: 1.5rem; letter-spacing: 1px; text-transform: uppercase; }
        .tree-scroll, .elev-scroll { flex: 1; overflow-y: auto; padding-right: 10px; }
        .loading-state { flex: 1; display: flex; align-items: center; justify-content: center; color: #6366f1; font-weight: 700; }

        .eq-ports-panel { background: rgba(0,0,0,0.4); margin: 0.6rem 0; padding: 1rem; border-radius: 0.8rem; border: 1px solid rgba(99,102,241,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.3); }
        .form-group{margin-bottom:.8rem}
        .form-group label{display:block;font-size:.7rem;color:#64748b;margin-bottom:.3rem}
        .form-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,.1);color:#fff;padding:.5rem;border-radius:.4rem;font-size:.85rem}
        .form-row{display:flex;gap:.5rem}

        .btn-primary{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;padding:.6rem;border-radius:.6rem;cursor:pointer;font-weight:600}
        .port-item { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; font-size: 0.65rem; }
        .port-item-col { display: flex; flex-direction: column; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
        .port-acts { display: flex; gap: 4px; align-items: center; }
        .mini-topic-input { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); color: #94a3b8; font-size: 0.55rem; padding: 1px 4px; border-radius: 3px; width: 80px; }
        .mini-topic-input:focus { border-color: #6366f1; width: 120px; outline: none; }
        
        .telemetry-bar { display: flex; gap: 8px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; margin-top: 4px; }
        .tel-val { font-size: 0.6rem; color: #34d399; font-family: monospace; }
        .tel-val.bold { font-weight: 800; color: #4ade80; text-shadow: 0 0 5px rgba(74,222,128,0.3); }
        .port-conns-row { font-size: 0.55rem; color: #6366f1; margin-top: 4px; display: flex; gap: 6px; }

        .btn-add-mini { background: none; border: 1px solid #475569; color: #475569; font-size: 0.55rem; padding: 1px 4px; border-radius: 4px; cursor: pointer; }
        .btn-add-mini:hover { color: #fff; border-color: #fff; }
        .btn-conn-mini { background: rgba(99,102,241,0.2); border: none; color: #a5b4fc; cursor: pointer; border-radius: 3px; padding: 1px 4px; }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:100}
        .modal{background:#111;border:1px solid #333;border-radius:1rem;width:400px;padding:1.5rem}
      `}</style>

      <div className="page">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h1 style={{fontSize:"1.8rem",fontWeight:800}}>📐 Gestión de Posiciones</h1>
          <Link href="/infrastructure/" className="back-btn">← Dashboard</Link>
        </div>

        <div className="layout">
          <div className="nav-panel">
            <div className="nav-title" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span>📍 Sitio</span>
              <button className="btn-add-mini" onClick={async () => {
                const name = prompt("Nombre del Nuevo Sitio:"); if(!name) return;
                const address = prompt("Dirección:");
                await api("/api/sites", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name, address}) });
                api("/api/geo").then(r => {
                  if(!r.ok) return;
                  const all = r.data.flatMap((c:any)=>c.regions.flatMap((rg:any)=>rg.provinces.flatMap((p:any)=>p.cities.flatMap((ci:any)=>ci.districts.flatMap((d:any)=>d.sites)))));
                  setSites(all);
                });
              }}>+</button>
            </div>
            {sites.map(s => (
              <div key={s.id} className={`nav-item ${site?.id === s.id ? "active" : ""}`} onClick={()=>{setSite(s); setStructure(null); setLevel(null); setRoom(null); api(`/api/structures?siteId=${s.id}`).then(r=>r.ok&&setStructures(r.data))}}>
                <span className="truncate flex-1">{s.name}</span>
                <div className="nav-item-actions">
                  <button onClick={async (e) => { e.stopPropagation(); const n = prompt("Nuevo nombre:", s.name); if(n) { await api(`/api/sites?id=${s.id}`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:n})}); window.location.reload(); } }}>✏️</button>
                  <button onClick={async (e) => { e.stopPropagation(); if(confirm("¿Eliminar Sitio?")) { await api(`/api/sites?id=${s.id}`, {method:"DELETE"}); window.location.reload(); } }}>🗑️</button>
                </div>
              </div>
            ))}
            
            {site && <>
              <div className="nav-title" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span>🏢 Edificio</span>
                <button className="btn-add-mini" onClick={async () => {
                  const name = prompt("Nombre del Edificio:"); if(!name) return;
                  await api("/api/structures", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name, siteId: site.id}) });
                  api(`/api/structures?siteId=${site.id}`).then(r=>r.ok&&setStructures(r.data));
                }}>+</button>
              </div>
              {structures.map(s => (
                <div key={s.id} className={`nav-item ${structure?.id === s.id ? "active" : ""}`} onClick={()=>{setStructure(s); setLevel(null); setRoom(null); api(`/api/levels?structureId=${s.id}`).then(r=>r.ok&&setLevels(r.data))}}>
                  <span className="truncate flex-1">{s.name}</span>
                  <div className="nav-item-actions">
                    <button onClick={async (e) => { e.stopPropagation(); const n = prompt("Nuevo nombre:", s.name); if(n) { await api(`/api/structures?id=${s.id}`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:n})}); api(`/api/structures?siteId=${site.id}`).then(r=>r.ok&&setStructures(r.data)); } }}>✏️</button>
                    <button onClick={async (e) => { e.stopPropagation(); if(confirm("¿Eliminar Edificio?")) { await api(`/api/structures?id=${s.id}`, {method:"DELETE"}); setStructure(null); api(`/api/structures?siteId=${site.id}`).then(r=>r.ok&&setStructures(r.data)); } }}>🗑️</button>
                  </div>
                </div>
              ))}
            </>}
            
            {structure && <>
              <div className="nav-title" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span>🏬 Piso</span>
                <button className="btn-add-mini" onClick={async () => {
                  const name = prompt("Nombre del Piso/Nivel:"); if(!name) return;
                  await api("/api/levels", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name, structureId: structure.id}) });
                  api(`/api/levels?structureId=${structure.id}`).then(r=>r.ok&&setLevels(r.data));
                }}>+</button>
              </div>
              {levels.map(l => (
                <div key={l.id} className={`nav-item ${level?.id === l.id ? "active" : ""}`} onClick={()=>{setLevel(l); setRoom(null); api(`/api/substructures?levelId=${l.id}`).then(r=>r.ok&&setRooms(r.data))}}>
                  <span className="truncate flex-1">{l.name}</span>
                  <div className="nav-item-actions">
                    <button onClick={async (e) => { e.stopPropagation(); const n = prompt("Nuevo nombre:", l.name); if(n) { await api(`/api/levels?id=${l.id}`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:n})}); api(`/api/levels?structureId=${structure.id}`).then(r=>r.ok&&setLevels(r.data)); } }}>✏️</button>
                    <button onClick={async (e) => { e.stopPropagation(); if(confirm("¿Eliminar Piso?")) { await api(`/api/levels?id=${l.id}`, {method:"DELETE"}); setLevel(null); api(`/api/levels?structureId=${structure.id}`).then(r=>r.ok&&setLevels(r.data)); } }}>🗑️</button>
                  </div>
                </div>
              ))}
            </>}
            
            {level && <>
              <div className="nav-title" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span>🚪 Sala</span>
                <button className="btn-add-mini" onClick={async () => {
                  const name = prompt("Nombre de la Sala (ej: TX-01):"); if(!name) return;
                  const rows = prompt("Bahías (separadas por coma, ej: A,B,C):", "A,B"); if(!rows) return;
                  const cols = prompt("Columnas (separadas por coma, ej: 1,2,3...):", "1,2,3,4,5,6,7,8"); if(!cols) return;
                  await api("/api/substructures", { 
                    method:"POST", 
                    headers:{"Content-Type":"application/json"}, 
                    body:JSON.stringify({
                      name, 
                      levelId: level.id, 
                      gridRows: rows.split(',').map(s=>s.trim()), 
                      gridCols: cols.split(',').map(s=>Number(s.trim())) 
                    }) 
                  });
                  api(`/api/substructures?levelId=${level.id}`).then(r=>r.ok&&setRooms(r.data));
                }}>+</button>
              </div>
              {rooms.map(r => (
                <div key={r.id} className={`nav-item ${room?.id === r.id ? "active" : ""}`} onClick={()=>{setRoom(r); loadPos(r.id)}}>
                  <span className="truncate flex-1">{r.name}</span>
                  <div className="nav-item-actions">
                    <button onClick={async (e) => { e.stopPropagation(); const n = prompt("Nuevo nombre:", r.name); if(n) { await api(`/api/substructures?id=${r.id}`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:n})}); api(`/api/substructures?levelId=${level.id}`).then(r=>r.ok&&setRooms(r.data)); } }}>✏️</button>
                    <button onClick={async (e) => { e.stopPropagation(); if(confirm("¿Eliminar Sala?")) { await api(`/api/substructures?id=${r.id}`, {method:"DELETE"}); setRoom(null); api(`/api/substructures?levelId=${level.id}`).then(r=>r.ok&&setRooms(r.data)); } }}>🗑️</button>
                  </div>
                </div>
              ))}
            </>}
          </div>

          <div>
            {!room ? <div className="eq-empty-state">Selecciona una sala</div> : (
              <div style={{display:"flex", flexDirection:"column", gap:"1rem"}}>
                <div style={{fontSize:".8rem", color:"#475569"}}>💡 Haz click en una baldosa vacía para agregar una posición.</div>
                <FloorPlan room={room} positions={positions} onSelectPos={setSelPos} onOpenCreate={(row:string,col:number)=>{setForm({...form,row,col,widthUnits:1,depthUnits:1,physWidthCm:60,physDepthCm:60}); setModal(true)}} />
              </div>
            )}
          </div>

          <div>
            {selPos && room ? (
              <PosDetail pos={selPos} room={room} siteId={site?.id||""} onClose={()=>setSelPos(null)} onUpdate={(id:string,p:any)=>api(`/api/positions?id=${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)}).then(()=>loadPos(room.id))} />
            ) : <div className="eq-empty-state">Selecciona una posición para ver su inventario</div>}
          </div>
        </div>
      </div>

      {modal && room && (
        <div className="overlay" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{marginBottom:"1.5rem", color:"#4ade80"}}>Nueva Posición en {form.row}{form.col}</h2>
            <div className="form-group"><label>Etiqueta Libre</label><input className="form-input" value={form.label} onChange={e=>setForm({...form, label:e.target.value})} placeholder="Ej: RACK-A1" /></div>
            <div className="section-divider">📏 Dimensiones Físicas (cm)</div>
            <div className="form-row">
               <div className="form-group" style={{flex:1}}><label>Ancho (cm)</label><input className="form-input" type="number" value={form.physWidthCm} onChange={e=>{const v=Number(e.target.value); setForm({...form, physWidthCm:v, widthUnits:Math.ceil(v/60)})}} /></div>
               <div className="form-group" style={{flex:1}}><label>Prof (cm)</label><input className="form-input" type="number" value={form.physDepthCm} onChange={e=>{const v=Number(e.target.value); setForm({...form, physDepthCm:v, depthUnits:Math.ceil(v/60)})}} /></div>
            </div>
            <div style={{fontSize:".7rem", color:"#64748b", marginTop:".5rem", background:"rgba(255,255,255,0.03)", padding:".5rem", borderRadius:".4rem"}}>Tiles Calculados: <strong>{form.widthUnits}x{form.depthUnits}</strong></div>
            <button className="btn-primary" style={{width:"100%", marginTop:"1.5rem"}} onClick={()=>{
               const ri = room.gridRows.indexOf(form.row);
               if (form.col + form.widthUnits - 1 > room.gridCols.length) return alert("Excede borde derecho");
               if (ri + form.depthUnits > room.gridRows.length) return alert("Excede borde inferior");
               api("/api/positions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form, substructureId:room.id})}).then(()=>{loadPos(room.id); setModal(false);})
            }}>Crear Posición</button>
          </div>
        </div>
      ) }
    </>
  );
}
