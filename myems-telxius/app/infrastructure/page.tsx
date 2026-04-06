"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const BASE = "/telxius";

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
  label: string | null;
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

// ─── Componentes Auxiliares ────────────────────────────────────────────────────

function ItemCard({ icon, label, sublabel, onClick }: { icon: string; label: string; sublabel: string | null; onClick: () => void }) {
  return (
    <div className="item-card" onClick={onClick}>
      <div className="card-icon">{icon}</div>
      <div className="card-info">
        <div style={{fontWeight:700, fontSize:"1.1rem"}}>{label}</div>
        <div style={{fontSize:".75rem", color:"#94a3b8"}}>{sublabel}</div>
      </div>
    </div>
  );
}

function Breadcrumb({ items }: { items: { label: string; onClick: () => void }[] }) {
  return (
    <div className="breadcrumb">
      <button onClick={() => window.location.reload()}>🌎 World</button>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{opacity:0.3}}> / </span>
          <button onClick={item.onClick}>{item.label}</button>
        </React.Fragment>
      ))}
    </div>
  );
}

function RoomGrid({ room, positions }: { room: Substructure; positions: Position[] }) {
  const router = useRouter();
  const occupiedBySpan = new Set<string>();
  const positionsByOrigin = new Map<string, Position>();

  positions.forEach(p => {
    positionsByOrigin.set(`${p.row}-${p.col}`, p);
    const ri = room.gridRows.indexOf(p.row);
    const ci = room.gridCols.indexOf(p.col);
    if (ri === -1 || ci === -1) return;
    for (let r = 0; r < (p.depthUnits||1); r++) {
      for (let c = 0; c < (p.widthUnits||1); c++) {
        if (r === 0 && c === 0) continue;
        const rl = room.gridRows[ri + r];
        const cv = room.gridCols[ci + c];
        if (rl && cv !== undefined) occupiedBySpan.add(`${rl}-${cv}`);
      }
    }
  });

  return (
    <div className="room-grid-wrap">
      <div className="room-grid-header">
        <div className="room-grid-title">🗺️ Plano: {room.name}</div>
        <button className="btn-manage" onClick={() => router.push(`${BASE}/positions`)}>⚙️ Gestión</button>
      </div>
      <div className="room-grid" style={{ gridTemplateColumns: `42px repeat(${room.gridCols.length}, 1fr)` }}>
        <div className="grid-cell header-cell" />
        {room.gridCols.map(col => <div key={col} className="grid-cell header-cell">{col}</div>)}
        {room.gridRows.map(row => (
          <React.Fragment key={row}>
            <div className="grid-cell header-cell">{row}</div>
            {room.gridCols.map(col => {
              const id = `${row}-${col}`;
              if (occupiedBySpan.has(id)) return null;

              const p = positionsByOrigin.get(id);
              const status = p?.status || "EMPTY";

              const style: React.CSSProperties = p ? {
                gridColumn: `span ${p.widthUnits}`,
                gridRow: `span ${p.depthUnits}`,
                background: status === "EMPTY" ? "" : status === "OCCUPIED" ? "rgba(99,102,241,.12)" : "rgba(245,158,11,.1)" ,
                borderColor: status === "EMPTY" ? "" : status === "OCCUPIED" ? "#6366f1" : "#f59e0b",
                height: `${(p.depthUnits) * 58 - 4}px`, zIndex: 2
              } : {};

              return (
                <div key={id} className={`grid-cell ${status.toLowerCase()} ${p?"has-data":""}`} style={style} onClick={() => router.push(`${BASE}/positions`)}>
                  {p ? (
                    <>
                      <div className="phys-rect" style={{
                         width: `${(p.physWidthCm / (p.widthUnits * 60)) * 100}%`,
                         height: `${(p.physDepthCm / (p.depthUnits * 60)) * 100}%`,
                         borderColor: status === "OCCUPIED" ? "#818cf8" : "#fbbf24"
                      } as React.CSSProperties} />
                      <span className="pos-label">{p.label}</span>
                      <span className="pos-id">{row}{col}</span>
                    </>
                  ): <div className="dot" />}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Main ───
export default function InfrastructurePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [rooms, setRooms] = useState<Substructure[]>([]);
  const [room, setRoom] = useState<Substructure | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

  const selectSite = (s: Site) => { setSite(s); setStructure(null); setLevel(null); setRoom(null); };
  const selectStructure = (s: Structure) => { setStructure(s); setLevel(null); setRoom(null); };
  const selectLevel = (l: Level) => { setLevel(l); setRoom(null); };
  const selectRoom = (r: Substructure) => setRoom(r);

  const crumbs = [];
  if (site) crumbs.push({ label: site.name, onClick: () => { setStructure(null); setLevel(null); setRoom(null); } });
  if (structure) crumbs.push({ label: structure.name, onClick: () => { setLevel(null); setRoom(null); } });
  if (level) crumbs.push({ label: level.name, onClick: () => { setRoom(null); } });
  if (room) crumbs.push({ label: room.name, onClick: () => {} });

  useEffect(() => { api("/api/sites").then(r => setSites(r.data || [])); }, []);
  useEffect(() => { if (site) api(`/api/infrastructure?siteId=${site.id}`).then(r => setStructures(r.data || [])); }, [site]);
  useEffect(() => { if (structure) api(`/api/infrastructure?structureId=${structure.id}`).then(r => setLevels(r.data || [])); }, [structure]);
  useEffect(() => { if (level) api(`/api/infrastructure?levelId=${level.id}`).then(r => setRooms(r.data || [])); }, [level]);
  useEffect(() => { if (room) api(`/api/positions?substructureId=${room.id}`).then(r => setPositions(r.data || [])); }, [room]);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0f;color:#e2e8f0;font-family:Inter,sans-serif}
        .page{padding:2rem;min-height:100vh}
        .header-top{display:flex;gap:1.5rem;align-items:center;margin-bottom:1.5rem}
        .page-title{font-size:1.8rem;font-weight:800}
        .breadcrumb{font-size:.85rem;color:#475569;margin-bottom:2rem}
        .breadcrumb button{background:none;border:none;color:#6366f1;cursor:pointer}
        
        .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.8rem}
        .item-card{display:flex;gap:1.2rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);padding:1.2rem;border-radius:1rem;cursor:pointer}
        .item-card:hover{background:rgba(99,102,241,.08);border-color:#6366f1}
        .card-icon{font-size:2rem}

        .room-grid-wrap{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:1rem;padding:1.5rem}
        .room-grid-header{display:flex;justify-content:space-between;margin-bottom:1.2rem}
        .room-grid-title{font-weight:700;color:#94a3b8}
        .btn-manage{background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,.2);color:#a5b4fc;padding:.4rem .8rem;border-radius:.5rem;cursor:pointer;font-size:.75rem}

        .room-grid{display:grid;gap:4px}
        .grid-cell{height:54px;border:1px solid rgba(255,255,255,.05);border-radius:.4rem;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden}
        .header-cell{background:rgba(255,255,255,.04);color:#475569;font-weight:700;font-size:.7rem}
        .dot{width:4px;height:4px;background:rgba(255,255,255,.05);border-radius:50%}
        
        .phys-rect{position:absolute;border:1px dashed rgba(255,255,255,.15);border-radius:2px;pointer-events:none}
        .pos-label{font-size:.65rem;font-weight:700;color:#fff}
        .pos-id{position:absolute;top:2px;left:4px;font-size:.6rem;opacity:.2}
        .back-btn{background:rgba(255,255,255,.05);color:#94a3b8;padding:.4rem 1rem;border-radius:.5rem;text-decoration:none;font-size:.8rem;border:1px solid rgba(255,255,255,.1)}
      `}</style>

      <div className="page">
        <header>
          <div className="header-top">
             <Link href="/telxius/sites/" className="back-btn">🌎 Geo</Link>
             <h1 className="page-title">Datacenter Infrastructure</h1>
          </div>
          <Breadcrumb items={crumbs} />
        </header>

        {!site && <div className="cards-grid">{sites.map(s => <ItemCard key={s.id} icon="🏗️" label={s.name} sublabel={s.address} onClick={()=>selectSite(s)} />)}</div>}
        {site && !structure && <div className="cards-grid">{structures.map(s => <ItemCard key={s.id} icon="🏢" label={s.name} sublabel="Edificio" onClick={()=>selectStructure(s)} />)}</div>}
        {structure && !level && <div className="cards-grid">{levels.map(l => <ItemCard key={l.id} icon="🏬" label={l.name} sublabel="Piso" onClick={()=>selectLevel(l)} />)}</div>}
        {level && !room && <div className="cards-grid">{rooms.map(r => <ItemCard key={r.id} icon="🚪" label={r.name} sublabel="Sala" onClick={()=>selectRoom(r)} />)}</div>}
        {room && <RoomGrid room={room} positions={positions} />}
      </div>
    </>
  );
}
