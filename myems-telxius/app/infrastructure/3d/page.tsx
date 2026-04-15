"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Position } from "@/lib/types";

const DataCenter3D = dynamic(() => import("../../../components/DataCenter3D"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6366f1" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spin" style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚙️</div>
        <p style={{fontFamily:"monospace", letterSpacing:".1em"}}>INICIALIZANDO MOTOR 3D...</p>
      </div>
    </div>
  ),
});

const BASE = "/telxius";

interface Site { id: string; name: string; }
interface Structure { id: string; name: string; }
interface Level { id: string; name: string; }
interface Substructure { id: string; name: string; gridRows: string[]; gridCols: number[]; }

async function api(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

export default function InfrastructurePage3D() {
  const [sites, setSites]           = useState<Site[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [levels, setLevels]         = useState<Level[]>([]);
  const [rooms, setRooms]           = useState<Substructure[]>([]);
  const [positions, setPositions]   = useState<Position[]>([]);

  const [site, setSite]           = useState<Site | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [level, setLevel]         = useState<Level | null>(null);
  const [room, setRoom]           = useState<Substructure | null>(null);
  const [selPos, setSelPos]       = useState<Position | null>(null);

  useEffect(() => {
    api("/api/geo").then(r => {
      if (!r.ok) return;
      const all = r.data.flatMap((c: any) =>
        c.regions.flatMap((rg: any) =>
          rg.provinces.flatMap((p: any) =>
            p.towns.flatMap((ci: any) =>
              ci.districts.flatMap((d: any) => d.sites)))));
      setSites(all);
    });
  }, []);

  const selectSite = useCallback((s: Site) => {
    setSite(s); setStructure(null); setLevel(null); setRoom(null); setPositions([]);
    api(`/api/structures?siteId=${s.id}`).then(r => r.ok && setStructures(r.data));
  }, []);

  const selectStructure = useCallback((s: Structure) => {
    setStructure(s); setLevel(null); setRoom(null); setPositions([]);
    api(`/api/levels?structureId=${s.id}`).then(r => r.ok && setLevels(r.data));
  }, []);

  const selectLevel = useCallback((l: Level) => {
    setLevel(l); setRoom(null); setPositions([]);
    api(`/api/substructures?levelId=${l.id}`).then(r => r.ok && setRooms(r.data));
  }, []);

  const selectRoom = useCallback((r: Substructure) => {
    setRoom(r); setPositions([]);
    api(`/api/positions?substructureId=${r.id}`).then(res => res.ok && setPositions(res.data));
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #08080f; color: #e2e8f0; font-family: Inter, sans-serif; overflow: hidden; }
        .layout { display: grid; grid-template-columns: 280px 1fr; height: 100vh; }
        .sidebar { background: rgba(0,0,0,.6); border-right: 1px solid rgba(255,255,255,.05); padding: 1.5rem; overflow-y: auto; }
        .nav-title { font-size: .7rem; text-transform: uppercase; color: #475569; margin-bottom: .6rem; margin-top: 1.2rem; }
        .nav-item { padding: .65rem; border-radius: .5rem; cursor: pointer; font-size: .85rem; transition: background .2s; border: 1px solid transparent; }
        .nav-item:hover { background: rgba(99,102,241,.1); }
        .nav-item.active { background: rgba(99,102,241,.2); border-color: rgba(99,102,241,.4); color: #a5b4fc; }
        .back-btn { display: inline-block; background: rgba(255,255,255,.05); color: #94a3b8; padding: .5rem 1rem; border-radius: .5rem; text-decoration: none; font-size: .8rem; margin-bottom: 1.5rem; border: 1px solid rgba(255,255,255,.1); }
        .pos-info { background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.3); border-radius: .8rem; padding: 1rem; margin-top: 2rem; position: sticky; bottom: 0; }
        .pos-id { font-size: 1.2rem; font-weight: 800; color: #a5b4fc; margin-bottom: .4rem; }
        .pos-label { font-size: .8rem; color: #e2e8f0; margin-bottom: .8rem; }
        .viewport { position: relative; background: #08080f; }
        .legend { position: absolute; bottom: 1.5rem; right: 1.5rem; background: rgba(0,0,0,.7); padding: 1rem; border-radius: .8rem; font-size: .75rem; border: 1px solid rgba(255,255,255,.05); }
        .legend-i { display: flex; align-items: center; gap: .5rem; margin-bottom: .4rem; }
        .dot { width: 10px; height: 10px; border-radius: 2px; }
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="layout">
        <div className="sidebar">
          <Link href="/infrastructure/" className="back-btn">← Volver a Dashboard</Link>
          <div style={{fontSize:"1.1rem", fontWeight:800, color:"#fff", marginBottom:"1.5rem"}}>🎮 EXPLORADOR 3D</div>

          <div className="nav-title">📍 Sitio</div>
          {sites.map(s => <div key={s.id} className={`nav-item ${site?.id === s.id ? "active" : ""}`} onClick={() => selectSite(s)}>{s.name}</div>)}

          {site && <>
            <div className="nav-title">🏢 Edificio</div>
            {structures.map(s => <div key={s.id} className={`nav-item ${structure?.id === s.id ? "active" : ""}`} onClick={() => selectStructure(s)}>{s.name}</div>)}
          </>}

          {structure && <>
            <div className="nav-title">🏬 Piso</div>
            {levels.map(l => <div key={l.id} className={`nav-item ${level?.id === l.id ? "active" : ""}`} onClick={() => selectLevel(l)}>{l.name}</div>)}
          </>}

          {level && <>
            <div className="nav-title">🚪 Sala</div>
            {rooms.map(r => <div key={r.id} className={`nav-item ${room?.id === r.id ? "active" : ""}`} onClick={() => selectRoom(r)}>{r.name}</div>)}
          </>}

          {selPos && (
            <div className="pos-info">
              <div className="pos-id">Posición {selPos.row}{selPos.col}</div>
              <div className="pos-label">{selPos.label || "Sin etiqueta"}</div>
              <div style={{fontSize:".7rem", color:"#64748b"}}>Footprint: {selPos.physWidthCm} x {selPos.physDepthCm} cm</div>
              <div style={{marginTop:".8rem", fontSize:".75rem", borderTop:"1px solid rgba(255,255,255,.1)", paddingTop:".8rem"}}>
                 Status: <span style={{color: selPos.status === "OCCUPIED" ? "#4ade80" : "#f59e0b"}}>{selPos.status}</span>
              </div>
            </div>
          )}
        </div>

        <div className="viewport">
          {room ? (
            <>
              <DataCenter3D room={room} positions={positions} onRackClick={setSelPos} />
              <div className="legend">
                <div className="legend-i"><span className="dot" style={{background:"#6366f1"}} /> Ocupado</div>
                <div className="legend-i"><span className="dot" style={{background:"#f59e0b"}} /> Reservado</div>
                <div className="legend-i"><span className="dot" style={{background:"#1e1b4b"}} /> Vacío</div>
              </div>
            </>
          ) : (
            <div style={{display:"flex", height:"100%", alignItems:"center", justifyContent:"center", color:"#1e1e3a", fontSize:"1.2rem", fontWeight:700}}>
              SELECCIONA UNA SALA PARA INICIAR EL RENDERIZADO
            </div>
          )}
        </div>
      </div>
    </>
  );
}
