"use client";

import React from "react";

interface Equipment {
  id: string;
  name: string;
  category: string;
  unitPosition: number | null;
  unitHeight: number | null;
  status?: string;
}

interface Props {
  equipments: Equipment[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  maxUnits?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  RACK: "#475569",
  SUBRACK: "#6366f1",
  CIRCUIT_PACK: "#34d399",
  CIRCUIT_BREAKER: "#f59e0b",
  POWER: "#f59e0b",
  NETWORKING: "#3b82f6",
};

export default function RackElevation({ equipments, selectedId, onSelect, maxUnits = 42 }: Props) {
  const units = Array.from({ length: maxUnits }, (_, i) => maxUnits - i);
  const rowHeight = 25; // Altura fija por cada U para alineación mecánica

  // Filtrar equipos que tienen posición vertical definida
  const placedItems = equipments.filter(e => e.unitPosition !== null && e.unitPosition > 0);

  return (
    <div className="rack-viewport">
      <style>{`
        .rack-viewport {
          background: #0a0a0f;
          border-radius: 1rem;
          padding: 1rem;
          display: flex;
          justify-content: center;
          height: 100%;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
        .rack-grid-container {
          display: grid;
          grid-template-columns: 35px 300px;
          gap: 0;
          position: relative;
        }
        /* Etiquetas laterales */
        .u-label {
          height: ${rowHeight}px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          color: #475569;
          font-weight: 700;
          border-right: 2px solid rgba(255,255,255,0.05);
        }
        /* Marco del Rack */
        .rack-frame-grid {
          display: grid;
          grid-template-rows: repeat(${maxUnits}, ${rowHeight}px);
          background: #05050a;
          border: 3px solid #1e1b4b;
          border-top: 6px solid #1e1b4b;
          border-bottom: 6px solid #1e1b4b;
          position: relative;
          box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }
        .slot-row {
          border-bottom: 1px solid rgba(255,255,255,0.03);
          width: 100%;
          height: ${rowHeight}px;
          box-sizing: border-box;
        }
        .slot-row:last-child { border-bottom: none; }
        
        /* Equipos montados */
        .placed-gear {
          position: absolute;
          left: 4px;
          right: 4px;
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 0 10px rgba(255,255,255,0.05);
          overflow: hidden;
          z-index: 5;
          text-align: center;
          padding: 0 5px;
        }
        .placed-gear:hover {
          filter: brightness(1.2);
          z-index: 10;
          box-shadow: 0 0 20px rgba(99,102,241,0.3);
        }
        .placed-gear.active-gear {
          border: 2px solid #fff;
          z-index: 11;
          box-shadow: 0 0 25px currentColor;
        }
        .gear-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .gear-coords {
          font-size: 0.5rem;
          opacity: 0.8;
          margin-top: 2px;
          font-family: monospace;
        }
        .indicator-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
        }
      `}</style>

      <div className="rack-grid-container">
        {/* Columna de etiquetas U */}
        <div className="labels-col">
          {units.map(u => (
            <div key={u} className="u-label">{u}</div>
          ))}
        </div>

        {/* Columna del Rack con Slots */}
        <div className="rack-frame-grid">
          {/* Fondo de rejilla técnica */}
          {units.map(u => (
            <div key={u} className="slot-row" />
          ))}

          {/* Equipos posicionados con Absolute pero alineados al Grid */}
          {placedItems.map(item => {
            const startU = item.unitPosition || 1;
            const hU = item.unitHeight || 1;
            const color = CATEGORY_COLORS[item.category] || "#6366f1";
            
            // Cálculo: En el renderizado, la U42 es la de arriba (index 0).
            // La posición superior (top) es (Total - (Posición + Altura - 1)) * rowHeight
            const top = (maxUnits - (startU + hU - 1)) * rowHeight;
            const height = (hU * rowHeight) - 2; // -2 para compensar bordes y spacing

            return (
              <div
                key={item.id}
                className={`placed-gear ${selectedId === item.id ? "active-gear" : ""}`}
                style={{
                  top: `${top + 1}px`, // +1 para centrar en el slot
                  height: `${height}px`,
                  backgroundColor: `${color}DD`, // DD es ~85% opacidad para el "sombreado" solicitado
                  borderColor: color,
                  color: "#fff", // Texto blanco sobre fondo pesado
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)"
                }}
                onClick={() => onSelect && onSelect(item.id)}
              >
                <div className="indicator-bar" style={{ backgroundColor: color }} />
                <span className="gear-title">{item.name}</span>
                <span className="gear-coords">{hU}U (U{startU})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
