"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Site { id: string; name: string; address: string | null; }
interface Structure { id: string; name: string; _count?: { levels: number }; }
interface Level { id: string; name: string; _count?: { rooms: number }; }
interface Substructure { id: string; name: string; type: string; gridRows: string[]; gridCols: number[]; _count?: { racks: number }; }
interface Container { id: string; name: string; row: string; position: number; }

const BASE = "/telxius";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="bc-sep">›</span>}
          {item.onClick
            ? <button className="bc-btn" onClick={item.onClick}>{item.label}</button>
            : <span className="bc-current">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

// ─── Modal Form ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSubmit, children }: {
  title: string; onClose: () => void; onSubmit: () => void; children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSubmit}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Grid ────────────────────────────────────────────────────────────────
function ItemCard({ icon, label, sublabel, badge, onClick }: {
  icon: string; label: string; sublabel?: string; badge?: string; onClick?: () => void;
}) {
  return (
    <div className={`item-card ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div className="card-icon">{icon}</div>
      <div className="card-body">
        <div className="card-label">{label}</div>
        {sublabel && <div className="card-sub">{sublabel}</div>}
        {badge && <span className="card-badge">{badge}</span>}
      </div>
      {onClick && <div className="card-arrow">›</div>}
    </div>
  );
}

// ─── Room Grid Visualizer ─────────────────────────────────────────────────────
function RoomGrid({ room, containers }: { room: Substructure; containers: Container[] }) {
  const occupied = new Map(containers.map(c => [`${c.row}-${c.position}`, c]));
  if (!room.gridRows.length || !room.gridCols.length) return null;

  return (
    <div className="room-grid-wrap">
      <div className="room-grid-title">🗺️ Plano de Sala</div>
      <div className="room-grid" style={{ gridTemplateColumns: `40px repeat(${room.gridCols.length}, 1fr)` }}>
        <div className="grid-cell header-cell" />
        {room.gridCols.map(col => (
          <div key={col} className="grid-cell header-cell">{col}</div>
        ))}
        {room.gridRows.map(row => (
          <>
            <div key={`row-${row}`} className="grid-cell header-cell row-header">{row}</div>
            {room.gridCols.map(col => {
              const rack = occupied.get(`${row}-${col}`);
              return (
                <div key={`${row}-${col}`} className={`grid-cell ${rack ? "occupied" : "empty"}`}>
                  {rack && <span className="rack-label">{rack.name}</span>}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InfrastructurePage() {
  // State — selected entities
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [rooms, setRooms] = useState<Substructure[]>([]);
  const [room, setRoom] = useState<Substructure | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | "structure" | "level" | "room" | "container">(null);
  const [form, setForm] = useState<Record<string, string>>({});

  // Load sites on mount
  useEffect(() => {
    api("/api/geo").then(r => {
      if (!r.ok) return;
      const allSites = r.data.flatMap((c: { regions: { provinces: { cities: { districts: { sites: Site[] }[] }[] }[] }[] }) =>
        c.regions.flatMap((rg: { provinces: { cities: { districts: { sites: Site[] }[] }[] }[] }) =>
          rg.provinces.flatMap((p: { cities: { districts: { sites: Site[] }[] }[] }) =>
            p.cities.flatMap((ci: { districts: { sites: Site[] }[] }) =>
              ci.districts.flatMap((d: { sites: Site[] }) => d.sites)))));
      setSites(allSites);
    });
  }, []);

  const loadStructures = useCallback((siteId: string) => {
    setLoading(true);
    api(`/api/structures?siteId=${siteId}`)
      .then(r => { if (r.ok) setStructures(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const loadLevels = useCallback((structureId: string) => {
    setLoading(true);
    api(`/api/levels?structureId=${structureId}`)
      .then(r => { if (r.ok) setLevels(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const loadRooms = useCallback((levelId: string) => {
    setLoading(true);
    api(`/api/substructures?levelId=${levelId}`)
      .then(r => { if (r.ok) setRooms(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const loadContainers = useCallback((substructureId: string) => {
    setLoading(true);
    api(`/api/containers?substructureId=${substructureId}`)
      .then(r => { if (r.ok) setContainers(r.data); })
      .finally(() => setLoading(false));
  }, []);

  // Selections
  const selectSite = (s: Site) => {
    setSite(s); setStructure(null); setLevel(null); setRoom(null);
    setStructures([]); setLevels([]); setRooms([]); setContainers([]);
    loadStructures(s.id);
  };
  const selectStructure = (s: Structure) => {
    setStructure(s); setLevel(null); setRoom(null);
    setLevels([]); setRooms([]); setContainers([]);
    loadLevels(s.id);
  };
  const selectLevel = (l: Level) => {
    setLevel(l); setRoom(null); setRooms([]); setContainers([]);
    loadRooms(l.id);
  };
  const selectRoom = (r: Substructure) => {
    setRoom(r); setContainers([]);
    loadContainers(r.id);
  };

  // Create handlers
  const handleCreate = async () => {
    if (modal === "structure" && site) {
      const r = await api("/api/structures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, siteId: site.id }),
      });
      if (r.ok) { loadStructures(site.id); }
    }
    if (modal === "level" && structure) {
      const r = await api("/api/levels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, structureId: structure.id }),
      });
      if (r.ok) { loadLevels(structure.id); }
    }
    if (modal === "room" && level) {
      const gridRows = (form.rows || "").split(",").map(s => s.trim()).filter(Boolean);
      const gridCols = (form.cols || "").split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
      const r = await api("/api/substructures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, levelId: level.id, type: "ROOM", gridRows, gridCols }),
      });
      if (r.ok) { loadRooms(level.id); }
    }
    if (modal === "container" && room) {
      const r = await api("/api/containers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, substructureId: room.id, row: form.row, position: form.position }),
      });
      if (r.ok) { loadContainers(room.id); }
    }
    setModal(null); setForm({});
  };

  // Breadcrumb items
  const crumbs = [
    { label: "Sitios", onClick: site ? () => { setSite(null); setStructure(null); setLevel(null); setRoom(null); } : undefined },
    ...(site ? [{ label: site.name, onClick: structure ? () => { setStructure(null); setLevel(null); setRoom(null); } : undefined }] : []),
    ...(structure ? [{ label: structure.name, onClick: level ? () => { setLevel(null); setRoom(null); } : undefined }] : []),
    ...(level ? [{ label: level.name, onClick: room ? () => { setRoom(null); } : undefined }] : []),
    ...(room ? [{ label: room.name }] : []),
  ];

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0f;color:#e2e8f0;font-family:Inter,system-ui,sans-serif}
        .page{min-height:100vh;padding:2rem;background:linear-gradient(135deg,#0a0a0f,#0f0f1a,#0a0a0f)}

        /* Header */
        .header{margin-bottom:2rem}
        .header-top{display:flex;align-items:center;gap:1rem;margin-bottom:.5rem}
        .page-title{font-size:1.9rem;font-weight:700;background:linear-gradient(135deg,#e2e8f0,#a5b4fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .page-sub{color:#64748b;font-size:.9rem;margin-top:.2rem}

        /* Breadcrumb */
        .breadcrumb{display:flex;align-items:center;gap:.25rem;margin-bottom:2rem;flex-wrap:wrap}
        .bc-sep{color:#334155;margin:0 .2rem}
        .bc-btn{background:none;border:none;color:#7c3aed;cursor:pointer;font-size:.9rem;padding:.2rem .4rem;border-radius:.3rem;transition:background .15s}
        .bc-btn:hover{background:rgba(124,58,237,.15)}
        .bc-current{color:#e2e8f0;font-size:.9rem;font-weight:600;padding:.2rem .4rem}

        /* Section header */
        .section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem}
        .section-title{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;display:flex;align-items:center;gap:.5rem}
        .section-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06);min-width:40px}

        /* Buttons */
        .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:.55rem 1.2rem;border-radius:.6rem;cursor:pointer;font-size:.85rem;font-weight:600;transition:opacity .2s}
        .btn-primary:hover{opacity:.85}
        .btn-ghost{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8;padding:.55rem 1.2rem;border-radius:.6rem;cursor:pointer;font-size:.85rem;transition:all .2s}
        .btn-ghost:hover{background:rgba(255,255,255,.1)}
        .btn-add{display:inline-flex;align-items:center;gap:.4rem;background:rgba(99,102,241,.12);border:1px dashed rgba(99,102,241,.4);color:#a5b4fc;padding:.5rem 1rem;border-radius:.6rem;cursor:pointer;font-size:.83rem;font-weight:500;transition:all .2s}
        .btn-add:hover{background:rgba(99,102,241,.25);border-style:solid}

        /* Cards */
        .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.85rem}
        .item-card{display:flex;align-items:center;gap:1rem;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:.9rem;padding:1rem 1.25rem;transition:all .2s}
        .item-card.clickable{cursor:pointer}
        .item-card.clickable:hover{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.3);transform:translateY(-1px)}
        .card-icon{font-size:1.6rem;flex-shrink:0}
        .card-body{flex:1;min-width:0}
        .card-label{font-weight:600;font-size:.95rem;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .card-sub{font-size:.78rem;color:#64748b;margin-top:.2rem}
        .card-badge{display:inline-block;margin-top:.4rem;background:rgba(99,102,241,.2);color:#a5b4fc;font-size:.7rem;padding:.1rem .5rem;border-radius:999px;font-weight:600}
        .card-arrow{color:#334155;font-size:1.2rem;font-weight:300}

        /* Sites panel */
        .sites-list{display:flex;flex-direction:column;gap:.6rem}

        /* Grid visualizer */
        .room-grid-wrap{margin-top:1.5rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:1rem;padding:1.5rem}
        .room-grid-title{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:1rem}
        .room-grid{display:grid;gap:4px}
        .grid-cell{height:52px;border-radius:.4rem;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600}
        .header-cell{background:rgba(255,255,255,.04);color:#475569}
        .row-header{color:#6366f1!important}
        .empty{background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.06)}
        .occupied{background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4)}
        .rack-label{color:#a5b4fc;font-size:.72rem;text-align:center}

        /* Containers list */
        .containers-list{display:flex;flex-direction:column;gap:.6rem;margin-top:1rem}
        .container-row{display:flex;align-items:center;gap:.75rem;background:rgba(99,102,241,.05);border:1px solid rgba(99,102,241,.15);border-radius:.7rem;padding:.7rem 1rem}
        .container-pos{background:rgba(99,102,241,.2);color:#a5b4fc;padding:.2rem .6rem;border-radius:.4rem;font-size:.75rem;font-weight:700;font-family:monospace}
        .container-name{font-weight:600;font-size:.9rem}

        /* Empty state */
        .empty-state{text-align:center;padding:3rem 2rem;color:#475569;border:1px dashed rgba(255,255,255,.07);border-radius:1rem}
        .empty-state .em-icon{font-size:2.5rem;margin-bottom:.75rem}
        .empty-state p{font-size:.9rem}

        /* Modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000}
        .modal{background:#111827;border:1px solid rgba(255,255,255,.1);border-radius:1.25rem;width:100%;max-width:440px;overflow:hidden}
        .modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,.08)}
        .modal-header h3{font-size:1rem;font-weight:600}
        .modal-close{background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;padding:.2rem}
        .modal-close:hover{color:#e2e8f0}
        .modal-body{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}
        .modal-footer{display:flex;gap:.75rem;justify-content:flex-end;padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,.08)}
        .form-group{display:flex;flex-direction:column;gap:.4rem}
        .form-label{font-size:.8rem;color:#94a3b8;font-weight:500}
        .form-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:.6rem;color:#e2e8f0;padding:.65rem .9rem;font-size:.9rem;outline:none;transition:border-color .2s}
        .form-input:focus{border-color:#6366f1}
        .form-hint{font-size:.73rem;color:#475569;margin-top:.15rem}

        /* Back link */
        .back-btn{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);color:#a5b4fc;padding:.35rem .85rem;border-radius:.5rem;text-decoration:none;font-size:.83rem;transition:all .2s}
        .back-btn:hover{background:rgba(99,102,241,.25)}

        /* Loading */
        .loading{display:flex;gap:.4rem;align-items:center;justify-content:center;padding:2rem;color:#475569;font-size:.9rem}
        .spin{width:14px;height:14px;border:2px solid rgba(99,102,241,.3);border-top-color:#6366f1;border-radius:50%;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <Link href="/telxius/sites/" className="back-btn">← Sitios</Link>
          </div>
          <h1 className="page-title">🏢 Infraestructura Operativa</h1>
          <p className="page-sub">Fase 2 — Edificios · Pisos · Salas · Racks</p>
        </div>

        {/* Breadcrumb */}
        <Breadcrumb items={crumbs} />

        {/* LEVEL 0: Sites */}
        {!site && (
          <div>
            <div className="section-header">
              <div className="section-title">📍 Selecciona un Sitio</div>
            </div>
            {sites.length === 0
              ? <div className="empty-state"><div className="em-icon">🌐</div><p>No hay sitios registrados. Ve a <Link href="/telxius/sites/" style={{color:"#a5b4fc"}}>Dominio Geográfico</Link></p></div>
              : <div className="sites-list">
                  {sites.map(s => (
                    <ItemCard key={s.id} icon="🏗️" label={s.name} sublabel={s.address ?? undefined} onClick={() => selectSite(s)} />
                  ))}
                </div>
            }
          </div>
        )}

        {/* LEVEL 1: Structures */}
        {site && !structure && (
          <div>
            <div className="section-header">
              <div className="section-title">🏢 Estructuras (Edificios)</div>
              <button className="btn-add" onClick={() => { setModal("structure"); setForm({}); }}>+ Nuevo Edificio</button>
            </div>
            {loading
              ? <div className="loading"><div className="spin" /> Cargando...</div>
              : structures.length === 0
                ? <div className="empty-state"><div className="em-icon">🏢</div><p>Sin edificios. Agrega uno para comenzar.</p></div>
                : <div className="cards-grid">
                    {structures.map(s => (
                      <ItemCard key={s.id} icon="🏢" label={s.name}
                        sublabel={`${s._count?.levels ?? 0} piso(s)`}
                        badge="Edificio"
                        onClick={() => selectStructure(s)} />
                    ))}
                  </div>
            }
          </div>
        )}

        {/* LEVEL 2: Levels */}
        {structure && !level && (
          <div>
            <div className="section-header">
              <div className="section-title">🏬 Pisos</div>
              <button className="btn-add" onClick={() => { setModal("level"); setForm({}); }}>+ Nuevo Piso</button>
            </div>
            {loading
              ? <div className="loading"><div className="spin" /> Cargando...</div>
              : levels.length === 0
                ? <div className="empty-state"><div className="em-icon">🏬</div><p>Sin pisos. Agrega uno para comenzar.</p></div>
                : <div className="cards-grid">
                    {levels.map(l => (
                      <ItemCard key={l.id} icon="🏬" label={l.name}
                        sublabel={`${l._count?.rooms ?? 0} sala(s)`}
                        badge="Piso"
                        onClick={() => selectLevel(l)} />
                    ))}
                  </div>
            }
          </div>
        )}

        {/* LEVEL 3: Rooms */}
        {level && !room && (
          <div>
            <div className="section-header">
              <div className="section-title">🚪 Salas</div>
              <button className="btn-add" onClick={() => { setModal("room"); setForm({ rows: "A,B,C", cols: "1,2,3,4,5" }); }}>+ Nueva Sala</button>
            </div>
            {loading
              ? <div className="loading"><div className="spin" /> Cargando...</div>
              : rooms.length === 0
                ? <div className="empty-state"><div className="em-icon">🚪</div><p>Sin salas. Agrega una para comenzar.</p></div>
                : <div className="cards-grid">
                    {rooms.map(r => (
                      <ItemCard key={r.id} icon="🚪" label={r.name}
                        sublabel={`Grid: ${r.gridRows.join(",")} × ${r.gridCols.join(",")}`}
                        badge={`${r._count?.racks ?? 0} rack(s)`}
                        onClick={() => selectRoom(r)} />
                    ))}
                  </div>
            }
          </div>
        )}

        {/* LEVEL 4: Containers */}
        {room && (
          <div>
            {/* Room grid visualizer */}
            <RoomGrid room={room} containers={containers} />

            <div className="section-header" style={{ marginTop: "1.5rem" }}>
              <div className="section-title">🖥️ Racks (Containers)</div>
              <button className="btn-add" onClick={() => {
                setModal("container");
                setForm({ row: room.gridRows[0] ?? "A", position: "1" });
              }}>+ Nuevo Rack</button>
            </div>
            {loading
              ? <div className="loading"><div className="spin" /> Cargando...</div>
              : containers.length === 0
                ? <div className="empty-state"><div className="em-icon">🖥️</div><p>Sin racks. Agrega uno para comenzar.</p></div>
                : <div className="containers-list">
                    {containers.map(c => (
                      <div key={c.id} className="container-row">
                        <div className="card-icon">🖥️</div>
                        <div className="container-pos">Fila {c.row} · Pos {c.position}</div>
                        <div className="container-name">{c.name}</div>
                      </div>
                    ))}
                  </div>
            }
          </div>
        )}

        {/* ─── Modals ─── */}
        {modal === "structure" && (
          <Modal title="Nuevo Edificio" onClose={() => setModal(null)} onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nombre del Edificio</label>
              <input className="form-input" placeholder="Ej: Edificio A" value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </Modal>
        )}

        {modal === "level" && (
          <Modal title="Nuevo Piso" onClose={() => setModal(null)} onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nombre del Piso</label>
              <input className="form-input" placeholder="Ej: Planta Baja / Piso 1" value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </Modal>
        )}

        {modal === "room" && (
          <Modal title="Nueva Sala" onClose={() => setModal(null)} onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nombre de la Sala</label>
              <input className="form-input" placeholder="Ej: Sala DC-01" value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Filas de la grilla (separadas por coma)</label>
              <input className="form-input" placeholder="A,B,C,D" value={form.rows ?? ""}
                onChange={e => setForm(f => ({ ...f, rows: e.target.value }))} />
              <span className="form-hint">Letras que identifican cada fila del plano</span>
            </div>
            <div className="form-group">
              <label className="form-label">Columnas de la grilla (números separados por coma)</label>
              <input className="form-input" placeholder="1,2,3,4,5" value={form.cols ?? ""}
                onChange={e => setForm(f => ({ ...f, cols: e.target.value }))} />
              <span className="form-hint">Posiciones numéricas por fila</span>
            </div>
          </Modal>
        )}

        {modal === "container" && room && (
          <Modal title="Nuevo Rack" onClose={() => setModal(null)} onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nombre del Rack</label>
              <input className="form-input" placeholder="Ej: RACK-01" value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fila</label>
              <select className="form-input" value={form.row ?? ""} onChange={e => setForm(f => ({ ...f, row: e.target.value }))}>
                {room.gridRows.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Posición</label>
              <select className="form-input" value={form.position ?? ""} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                {room.gridCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}
