"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site {
  id: string;
  name: string;
  address: string | null;
  geoCoords: string | null;
}

interface District {
  id: string;
  name: string;
  sites: Site[];
}

interface City {
  id: string;
  name: string;
  districts: District[];
}

interface Province {
  id: string;
  name: string;
  cities: City[];
}

interface Region {
  id: string;
  name: string;
  provinces: Province[];
}

interface Country {
  id: string;
  name: string;
  regions: Region[];
}

// ─── Components ───────────────────────────────────────────────────────────────

function SiteCard({ site }: { site: Site }) {
  return (
    <div className="site-card">
      <div className="site-icon">🏗️</div>
      <div className="site-info">
        <h4>{site.name}</h4>
        {site.address && <p className="site-address">📍 {site.address}</p>}
        {site.geoCoords && <p className="site-coords">🌐 {site.geoCoords}</p>}
        <span className="site-badge">Sitio Activo</span>
      </div>
    </div>
  );
}

function TreeNode({
  label,
  icon,
  level,
  children,
  count,
}: {
  label: string;
  icon: string;
  level: number;
  children?: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(true);
  const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e879f9"];
  const color = colors[Math.min(level, colors.length - 1)];

  return (
    <div className="tree-node" style={{ "--node-color": color } as React.CSSProperties}>
      <button className="tree-label" onClick={() => setOpen((o) => !o)}>
        <span className="tree-icon">{icon}</span>
        <span className="tree-name">{label}</span>
        {count !== undefined && <span className="tree-count">{count}</span>}
        {children && <span className="tree-chevron">{open ? "▾" : "▸"}</span>}
      </button>
      {open && children && <div className="tree-children">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SitesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/appm-ems/api/geo/")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setCountries(res.data);
        else setError(res.error);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate stats
  const totalSites = countries.flatMap((c) =>
    c.regions.flatMap((r) =>
      r.provinces.flatMap((p) =>
        p.cities.flatMap((ci) => ci.districts.flatMap((d) => d.sites))
      )
    )
  ).length;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #0a0a0f; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }

        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%);
          padding: 2rem;
        }

        /* Header */
        .header {
          margin-bottom: 2.5rem;
        }
        .header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }
        .back-btn {
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          color: #a5b4fc;
          padding: 0.4rem 0.9rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .back-btn:hover { background: rgba(99,102,241,0.3); }
        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #e2e8f0, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .page-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin-top: 0.25rem;
        }

        /* Stats */
        .stats-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1rem;
          padding: 1.25rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 140px;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #a5b4fc;
        }
        .stat-label {
          font-size: 0.8rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Layout */
        .content-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .content-grid { grid-template-columns: 1fr; }
        }

        /* Tree panel */
        .panel {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 1.25rem;
          padding: 1.5rem;
        }
        .panel-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .panel-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        /* Tree nodes */
        .tree-node { margin-bottom: 0.25rem; }
        .tree-label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          background: transparent;
          border: none;
          color: #cbd5e1;
          padding: 0.55rem 0.75rem;
          border-radius: 0.6rem;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          font-size: 0.9rem;
        }
        .tree-label:hover { background: rgba(255,255,255,0.05); }
        .tree-icon { font-size: 1.1rem; flex-shrink: 0; }
        .tree-name { flex: 1; font-weight: 500; }
        .tree-count {
          background: rgba(99,102,241,0.2);
          color: #a5b4fc;
          font-size: 0.7rem;
          padding: 0.1rem 0.5rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .tree-chevron { color: #475569; font-size: 0.75rem; }
        .tree-children {
          margin-left: 1.5rem;
          border-left: 1px solid rgba(99,102,241,0.15);
          padding-left: 0.75rem;
          margin-top: 0.25rem;
        }

        /* Site cards panel */
        .sites-panel { display: flex; flex-direction: column; gap: 1rem; }
        .site-card {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: border-color 0.2s, background 0.2s;
        }
        .site-card:hover {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.1);
        }
        .site-icon {
          font-size: 2rem;
          background: rgba(99,102,241,0.15);
          border-radius: 0.75rem;
          width: 3.5rem;
          height: 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .site-info { flex: 1; }
        .site-info h4 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 0.4rem;
        }
        .site-address, .site-coords {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 0.2rem;
        }
        .site-badge {
          display: inline-block;
          margin-top: 0.6rem;
          background: rgba(34,197,94,0.15);
          color: #4ade80;
          border: 1px solid rgba(34,197,94,0.3);
          font-size: 0.72rem;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* Empty / loading */
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #475569;
        }
        .empty-state .big { font-size: 3rem; margin-bottom: 1rem; }
        .loading-pulse {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          align-items: center;
          padding: 3rem;
        }
        .dot {
          width: 10px; height: 10px;
          background: #6366f1;
          border-radius: 50%;
          animation: pulse 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .error-box {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          font-size: 0.9rem;
        }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <Link href="/" className="back-btn">← Inicio</Link>
          </div>
          <h1 className="page-title">🌍 Dominio Geográfico</h1>
          <p className="page-subtitle">Jerarquía estática de sitios — Fase 1 del EMS</p>
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{countries.length}</span>
              <span className="stat-label">Países</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {countries.reduce((a, c) => a + c.regions.length, 0)}
              </span>
              <span className="stat-label">Regiones</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {countries.reduce((a, c) =>
                  a + c.regions.reduce((b, r) =>
                    b + r.provinces.reduce((d, p) =>
                      d + p.cities.reduce((e, ci) => e + ci.districts.length, 0), 0), 0), 0)}
              </span>
              <span className="stat-label">Distritos</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{totalSites}</span>
              <span className="stat-label">Sitios</span>
            </div>
          </div>
        )}

        {/* Main content */}
        {loading && (
          <div className="loading-pulse">
            <div className="dot" /><div className="dot" /><div className="dot" />
          </div>
        )}

        {error && <div className="error-box">❌ Error cargando datos: {error}</div>}

        {!loading && !error && (
          <div className="content-grid">
            {/* Left: Tree */}
            <div className="panel">
              <div className="panel-title">🌳 Árbol Jerárquico</div>
              {countries.length === 0 ? (
                <div className="empty-state">
                  <div className="big">🌐</div>
                  <p>Sin datos geográficos</p>
                </div>
              ) : (
                countries.map((country) => (
                  <TreeNode
                    key={country.id}
                    label={country.name}
                    icon="🌎"
                    level={0}
                    count={country.regions.length}
                  >
                    {country.regions.map((region) => (
                      <TreeNode
                        key={region.id}
                        label={region.name}
                        icon="🗺️"
                        level={1}
                        count={region.provinces.length}
                      >
                        {region.provinces.map((province) => (
                          <TreeNode
                            key={province.id}
                            label={province.name}
                            icon="🏛️"
                            level={2}
                            count={province.cities.length}
                          >
                            {province.cities.map((city) => (
                              <TreeNode
                                key={city.id}
                                label={city.name}
                                icon="🏙️"
                                level={3}
                                count={city.districts.length}
                              >
                                {city.districts.map((district) => (
                                  <TreeNode
                                    key={district.id}
                                    label={district.name}
                                    icon="📍"
                                    level={4}
                                    count={district.sites.length}
                                  >
                                    {district.sites.map((site) => (
                                      <TreeNode
                                        key={site.id}
                                        label={site.name}
                                        icon="🏗️"
                                        level={5}
                                      />
                                    ))}
                                  </TreeNode>
                                ))}
                              </TreeNode>
                            ))}
                          </TreeNode>
                        ))}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ))
              )}
            </div>

            {/* Right: Site cards */}
            <div>
              <div className="panel" style={{ marginBottom: "1rem" }}>
                <div className="panel-title">🏗️ Sitios Registrados</div>
                <div className="sites-panel">
                  {countries.flatMap((c) =>
                    c.regions.flatMap((r) =>
                      r.provinces.flatMap((p) =>
                        p.cities.flatMap((ci) =>
                          ci.districts.flatMap((d) =>
                            d.sites.map((site) => (
                              <SiteCard key={site.id} site={site} />
                            ))
                          )
                        )
                      )
                    )
                  )}
                  {totalSites === 0 && (
                    <div className="empty-state">
                      <div className="big">🏗️</div>
                      <p>No hay sitios registrados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
