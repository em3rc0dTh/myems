"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

// Dynamic import to avoid SSR issues with Three.js
const DataCenter3D = dynamic(() => import("../../../components/DataCenter3D"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#475569" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚙️</div>
        <p>Cargando motor 3D...</p>
      </div>
    </div>
  ),
});

const BASE = "/telxius";

interface Site { id: string; name: string; address: string | null; }
interface Structure { id: string; name: string; }
interface Level { id: string; name: string; }
interface Substructure { id: string; name: string; gridRows: string[]; gridCols: number[]; }
interface Container { id: string; name: string; row: string; position: number; }

async function api(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

export default function InfrastructurePage3D() {
  const [sites, setSites]           = useState<Site[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [levels, setLevels]         = useState<Level[]>([]);
  const [rooms, setRooms]           = useState<Substructure[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

  const [site, setSite]           = useState<Site | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [level, setLevel]         = useState<Level | null>(null);
  const [room, setRoom]           = useState<Substructure | null>(null);
  const [selectedRack, setSelectedRack] = useState<Container | null>(null);

  // Load sites
  useEffect(() => {
    api("/api/geo").then(r => {
      if (!r.ok) return;
      const allSites = r.data.flatMap((c: {regions: {provinces: {cities: {districts: {sites: Site[]}[]}[]}[]}[]}) =>
        c.regions.flatMap((rg: {provinces: {cities: {districts: {sites: Site[]}[]}[]}[]}) =>
          rg.provinces.flatMap((p: {cities: {districts: {sites: Site[]}[]}[]}) =>
            p.cities.flatMap((ci: {districts: {sites: Site[]}[]}) =>
              ci.districts.flatMap((d: {sites: Site[]}) => d.sites)))));
      setSites(allSites);
    });
  }, []);

  const selectSite = useCallback((s: Site) => {
    setSite(s); setStructure(null); setLevel(null); setRoom(null); setContainers([]);
    api(`/api/structures?siteId=${s.id}`).then(r => r.ok && setStructures(r.data));
  }, []);

  const selectStructure = useCallback((s: Structure) => {
    setStructure(s); setLevel(null); setRoom(null); setContainers([]);
    api(`/api/levels?structureId=${s.id}`).then(r => r.ok && setLevels(r.data));
  }, []);

  const selectLevel = useCallback((l: Level) => {
    setLevel(l); setRoom(null); setContainers([]);
    api(`/api/substructures?levelId=${l.id}`).then(r => r.ok && setRooms(r.data));
  }, []);

  const selectRoom = useCallback((r: Substructure) => {
    setRoom(r); setContainers([]);
    api(`/api/containers?substructureId=${r.id}`).then(res => res.ok && setContainers(res.data));
  }, []);


  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #08080f; color: #e2e8f0; font-family: Inter, system-ui, sans-serif; overflow: hidden; }

        .layout {
          display: grid;
          grid-template-rows: auto 1fr;
          height: 100vh;
          overflow: hidden;
        }

        /* ── Top bar ── */
        .topbar {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: .75rem 1.5rem;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,.06);
          z-index: 10;
          flex-wrap: wrap;
        }
        .topbar-title {
          font-size: 1rem;
          font-weight: 700;
          background: linear-gradient(135deg, #e2e8f0, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
        }
        .back-btn {
          background: rgba(99,102,241,.12);
          border: 1px solid rgba(99,102,241,.3);
          color: #a5b4fc;
          padding: .3rem .8rem;
          border-radius: .5rem;
          text-decoration: none;
          font-size: .8rem;
          transition: all .2s;
          white-space: nowrap;
        }
        .back-btn:hover { background: rgba(99,102,241,.3); }

        /* Step selectors in topbar */
        .step-row { display: flex; align-items: center; gap: .5rem; flex: 1; flex-wrap: wrap; }
        .step-sep { color: #334155; font-size: .85rem; }
        .step-select {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.1);
          color: #e2e8f0;
          padding: .3rem .7rem;
          border-radius: .5rem;
          font-size: .82rem;
          cursor: pointer;
          outline: none;
          transition: border-color .2s;
        }
        .step-select:focus { border-color: #6366f1; }
        .step-label { font-size: .75rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }

        /* ── Main content ── */
        .main { display: grid; grid-template-columns: 280px 1fr; height: 100%; overflow: hidden; }

        /* ── Left panel ── */
        .left-panel {
          background: rgba(0,0,0,.5);
          border-right: 1px solid rgba(255,255,255,.06);
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: .75rem;
        }
        .left-panel::-webkit-scrollbar { width: 4px; }
        .left-panel::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 4px; }

        .panel-section { display: flex; flex-direction: column; gap: .4rem; }
        .panel-section-title {
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #334155;
          padding: .2rem 0;
        }
        .panel-item {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: .6rem;
          padding: .6rem .9rem;
          cursor: pointer;
          transition: all .15s;
          font-size: .85rem;
        }
        .panel-item:hover   { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.35); }
        .panel-item.active  { background: rgba(99,102,241,.2); border-color: rgba(99,102,241,.6); color: #a5b4fc; font-weight: 600; }
        .panel-item-name    { font-weight: 500; }
        .panel-item-sub     { font-size: .72rem; color: #475569; margin-top: .15rem; }

        /* Rack info panel */
        .rack-info {
          background: rgba(99,102,241,.08);
          border: 1px solid rgba(99,102,241,.25);
          border-radius: .75rem;
          padding: 1rem;
          margin-top: .5rem;
        }
        .rack-info-title { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: #6366f1; margin-bottom: .75rem; }
        .rack-info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; font-size: .83rem; }
        .rack-info-label { color: #64748b; }
        .rack-info-value { color: #e2e8f0; font-weight: 600; }
        .rack-badge {
          display: inline-block;
          margin-top: .5rem;
          background: rgba(34,197,94,.15);
          color: #4ade80;
          border: 1px solid rgba(34,197,94,.3);
          font-size: .7rem;
          padding: .2rem .6rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .rack-dismiss { background: none; border: none; color: #475569; cursor: pointer; font-size: .75rem; float: right; }
        .rack-dismiss:hover { color: #94a3b8; }

        /* Stat pills */
        .stat-pills { display: flex; gap: .5rem; flex-wrap: wrap; }
        .stat-pill {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: .5rem;
          padding: .35rem .7rem;
          font-size: .75rem;
          color: #94a3b8;
        }
        .stat-pill span { color: #a5b4fc; font-weight: 700; }

        /* ── 3D viewport ── */
        .viewport {
          position: relative;
          overflow: hidden;
          background: #08080f;
        }

        /* Prompt overlay when no room selected */
        .viewport-prompt {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #1e1e3a;
          pointer-events: none;
          gap: 1rem;
        }
        .viewport-prompt .big { font-size: 5rem; }
        .viewport-prompt p { font-size: 1.1rem; letter-spacing: .04em; }

        /* Corner legend */
        .legend {
          position: absolute;
          bottom: 1.25rem;
          right: 1.25rem;
          background: rgba(0,0,0,.65);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: .75rem;
          padding: .75rem 1rem;
          font-size: .75rem;
          color: #64748b;
          display: flex;
          flex-direction: column;
          gap: .4rem;
        }
        .legend-item { display: flex; align-items: center; gap: .5rem; }
        .legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

        /* Controls hint */
        .controls-hint {
          position: absolute;
          bottom: 1.25rem;
          left: 1.25rem;
          background: rgba(0,0,0,.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: .6rem;
          padding: .5rem .9rem;
          font-size: .72rem;
          color: #334155;
        }

        /* Empty state */
        .empty-msg { color: #1e1e3a; font-size: .82rem; text-align: center; padding: 1.5rem .5rem; }
      `}</style>

      <div className="layout">
        {/* Top bar */}
        <div className="topbar">
          <Link href="/infrastructure/" className="back-btn">← Vista Normal</Link>
          <div className="topbar-title">🏢 Vista 3D — Data Center</div>

          {room && (
            <div className="stat-pills">
              <div className="stat-pill">Sala: <span>{room.name}</span></div>
              <div className="stat-pill">Grid: <span>{room.gridRows.length}×{room.gridCols.length}</span></div>
              <div className="stat-pill">Racks: <span>{containers.length}</span></div>
              <div className="stat-pill">Vacíos: <span>{room.gridRows.length * room.gridCols.length - containers.length}</span></div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="main">
          {/* Left panel */}
          <div className="left-panel">

            {/* Sitio */}
            <div className="panel-section">
              <div className="panel-section-title">📍 Sitio</div>
              {sites.map(s => (
                <div key={s.id} className={`panel-item ${site?.id === s.id ? "active" : ""}`}
                  onClick={() => selectSite(s)}>
                  <div className="panel-item-name">{s.name}</div>
                  {s.address && <div className="panel-item-sub">{s.address}</div>}
                </div>
              ))}
              {sites.length === 0 && <div className="empty-msg">Sin sitios</div>}
            </div>

            {/* Edificio */}
            {site && (
              <div className="panel-section">
                <div className="panel-section-title">🏢 Edificio</div>
                {structures.map(s => (
                  <div key={s.id} className={`panel-item ${structure?.id === s.id ? "active" : ""}`}
                    onClick={() => selectStructure(s)}>
                    <div className="panel-item-name">{s.name}</div>
                  </div>
                ))}
                {structures.length === 0 && <div className="empty-msg">Sin edificios</div>}
              </div>
            )}

            {/* Piso */}
            {structure && (
              <div className="panel-section">
                <div className="panel-section-title">🏬 Piso</div>
                {levels.map(l => (
                  <div key={l.id} className={`panel-item ${level?.id === l.id ? "active" : ""}`}
                    onClick={() => selectLevel(l)}>
                    <div className="panel-item-name">{l.name}</div>
                  </div>
                ))}
                {levels.length === 0 && <div className="empty-msg">Sin pisos</div>}
              </div>
            )}

            {/* Sala */}
            {level && (
              <div className="panel-section">
                <div className="panel-section-title">🚪 Sala</div>
                {rooms.map(r => (
                  <div key={r.id} className={`panel-item ${room?.id === r.id ? "active" : ""}`}
                    onClick={() => selectRoom(r)}>
                    <div className="panel-item-name">{r.name}</div>
                    <div className="panel-item-sub">Grid {r.gridRows.length}×{r.gridCols.length}</div>
                  </div>
                ))}
                {rooms.length === 0 && <div className="empty-msg">Sin salas</div>}
              </div>
            )}

            {/* Selected rack info */}
            {selectedRack && (
              <div className="rack-info">
                <div className="rack-info-title">
                  🖥️ Rack Seleccionado
                  <button className="rack-dismiss" onClick={() => setSelectedRack(null)}>✕</button>
                </div>
                <div className="rack-info-row">
                  <span className="rack-info-label">Nombre</span>
                  <span className="rack-info-value">{selectedRack.name}</span>
                </div>
                <div className="rack-info-row">
                  <span className="rack-info-label">Fila</span>
                  <span className="rack-info-value">{selectedRack.row}</span>
                </div>
                <div className="rack-info-row">
                  <span className="rack-info-label">Posición</span>
                  <span className="rack-info-value">{selectedRack.position}</span>
                </div>
                <span className="rack-badge">ACTIVO</span>
              </div>
            )}
          </div>

          {/* 3D Viewport */}
          <div className="viewport">
            {room ? (
              <>
                <DataCenter3D
                  room={room}
                  containers={containers}
                  onRackClick={(rack) => setSelectedRack(rack)}
                />
                <div className="legend">
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: "#6366f1" }} />
                    <span>Rack instalado</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: "#1a1a2e", border: "1px solid #1e1e3a" }} />
                    <span>Slot vacío</span>
                  </div>
                </div>
                <div className="controls-hint">🖱️ Drag para orbitar · Scroll para zoom · Click en rack</div>
              </>
            ) : (
              <div className="viewport-prompt">
                <div className="big">🏗️</div>
                <p>Selecciona una Sala en el panel izquierdo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
