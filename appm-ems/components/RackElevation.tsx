"use client";

import React from "react";

interface Equipment {
  id: string;
  name: string;
  category: string;
  uPosition?: number;
  uHeight?: number;
  unitPosition?: number | null;
  unitHeight?: number | null;
  status?: string;
  equipments?: any[];
}

interface Props {
  equipments: Equipment[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  maxUnits?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  RACK: "#475569",
  SUBRACK: "#3b82f6", // Blue for Device as per drawing
  CIRCUIT_PACK: "#22c55e", // Green for sub-components as per drawing
  CIRCUIT_BREAKER: "#f59e0b",
  POWER: "#f59e0b",
  NETWORKING: "#3b82f6",
};

export default function RackElevation({ equipments, selectedId, onSelect, maxUnits = 42 }: Props) {
  const units = Array.from({ length: maxUnits }, (_, i) => maxUnits - i);
  const rowHeight = 32; // Un poco más alto para que quepan las etiquetas internas

  const placedItems = equipments.filter(e => (e.uPosition || e.unitPosition) !== null && (e.uPosition || e.unitPosition || 0) > 0);

  return (
    <div className="rack-viewport">
      <style>{`
        .rack-viewport {
          background: #020617;
          border-radius: 2rem;
          padding: 1.5rem;
          display: flex;
          justify-content: center;
          height: 100%;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #1e293b transparent;
        }
        .rack-grid-container {
          display: grid;
          grid-template-columns: 35px 1fr;
          gap: 0;
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .u-label {
          height: ${rowHeight}px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          color: #334155;
          font-weight: 800;
          border-right: 2px solid rgba(255,255,255,0.03);
        }
        .rack-frame-grid {
          display: grid;
          grid-template-rows: repeat(${maxUnits}, ${rowHeight}px);
          background: #050508;
          border-left: 4px solid #1e293b;
          border-right: 4px solid #1e293b;
          border-top: 8px solid #0f172a;
          border-bottom: 8px solid #0f172a;
          position: relative;
          box-shadow: inset 0 0 100px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.5);
        }
        .slot-row {
          border-bottom: 1px solid rgba(255,255,255,0.02);
          width: 100%;
          height: ${rowHeight}px;
          box-sizing: border-box;
        }
        
        /* THE DEVICE (Blue container in sketch) */
        .device-container {
          position: absolute;
          left: 6px;
          right: 6px;
          border: 2px solid #3b82f6;
          background: rgba(59, 130, 246, 0.05);
          border-radius: 8px;
          padding: 8px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .device-container:hover {
          background: rgba(59, 130, 246, 0.1);
          border-color: #60a5fa;
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
        }
        .device-container.active-device {
          border-color: #fff;
          box-shadow: 0 0 40px rgba(59, 130, 246, 0.4);
        }

        /* METADATA LABEL (Pink/Red in sketch) */
        .meta-label {
          position: absolute;
          top: -15px;
          left: -40px;
          color: #f43f5e;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          line-height: 1.2;
          pointer-events: none;
          white-space: nowrap;
        }

        /* EQUIPMENT (Green sub-blocks in sketch) */
        .sub-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          height: 100%;
          flex: 1;
        }
        .equipment-block {
          border: 1.5px solid #22c55e;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 40px;
        }
        .equipment-id {
          font-size: 11px;
          font-weight: 900;
          color: #22c55e;
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
        }
        .device-title {
          font-size: 9px;
          font-weight: 900;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
          opacity: 0.8;
        }
      `}</style>

      <div className="rack-grid-container">
        <div className="labels-col">
          {units.map(u => (
            <div key={u} className="u-label">{u}</div>
          ))}
        </div>

        <div className="rack-frame-grid">
          {units.map(u => (
            <div key={u} className="slot-row" />
          ))}

          {placedItems.map(item => {
            const startU = item.uPosition || item.unitPosition || 1;
            const hU = item.uHeight || item.unitHeight || 1;

            const top = (maxUnits - (startU + hU - 1)) * rowHeight;
            const height = (hU * rowHeight) - 4;

            // Group nested equipments into a grid
            // If they are panels, they might have names like "Panel A1", "Panel B2"
            // We'll extract the ID (e.g. "A1") for the visualization
            const children = item.equipments || [];

            return (
              <div
                key={item.id}
                className={`device-container ${selectedId === item.id ? "active-device" : ""}`}
                style={{
                  top: `${top + 2}px`,
                  height: `${height}px`,
                }}
                onClick={() => onSelect && onSelect(item.id)}
              >
                {/* Visual Label from sketch */}
                {/* <div className="meta-label">
                  Bay: ROW:{startU} / COL:1<br/>
                  Label: {item.name}
                </div> */}

                {/* <div className="device-title">{item.name} ({hU}U)</div> */}

                <div className="sub-grid">
                  {children.length > 0 ? children.map((sub, idx) => {
                    const match = sub.name.match(/[A-Z][0-9]/);
                    const label = match ? match[0] : `P${idx + 1}`;

                    // Logic for spanning: if odd number and it's the last item, span 2 columns
                    const isLast = idx === children.length - 1;
                    const isOddTotal = children.length % 2 !== 0;
                    const spanTwo = (isOddTotal && isLast) || children.length === 1;

                    return (
                      <div
                        key={sub.id}
                        className="equipment-block"
                        style={{ gridColumn: spanTwo ? "span 2" : "span 1" }}
                      >
                        <span className="equipment-id">{label}</span>
                      </div>
                    );
                  }) : (
                    <div className="equipment-block col-span-2 opacity-30">
                      <span className="equipment-id text-[8px]">ACTIVE DEVICE</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
