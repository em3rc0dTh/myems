
"use client"
import React, { useState } from 'react';
import {
  Box,
  Layers,
  Cpu,
  HardDrive,
  Zap,
  ChevronRight,
  ChevronDown,
  Square,
  Activity,
  Map
} from 'lucide-react';
import { TAPIEquipment, EquipmentCategory } from '../lib/types';

interface InfrastructureExplorerProps {
  equipment: TAPIEquipment[];
  siteName?: string;
  roomName?: string;
  bayName?: string;
  onSelect?: (item: TAPIEquipment) => void;
}

// Custom Icons
const PolygonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 2 7 6 20 18 20 22 7 12 2" />
  </svg>
);

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21h18M9 21V9l3-3 3 3v12M5 21V5l7-4 7 4v16" />
  </svg>
);

const TrapezoidIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="6 6 18 6 22 18 2 18" />
  </svg>
);

const MatrixIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="6" height="16" rx="1" />
    <rect x="14" y="4" width="6" height="16" rx="1" />
  </svg>
);

const CategoryIcon = ({ category, className }: { category: EquipmentCategory | string, className?: string }) => {
  switch (category) {
    case 'SITE': return <PolygonIcon className={className} />;
    case 'STRUCTURE': return <BuildingIcon className={className} />;
    case 'ROOM': return <TrapezoidIcon className={className} />;
    case 'BAY': return <MatrixIcon className={className} />;
    case 'SHELF': return <Box className={className} />;
    case 'SUBSHELF': return <Layers className={className} />;
    case 'CIRCUIT_PACK': return <Cpu className={className} />;
    case 'CIRCUIT_BREAKER_PANEL': return <Square className={className} />;
    case 'MODULE_SFP': return <HardDrive className={className} />;
    case 'BREAKER': return <Zap className={className} />;
    default: return <Box className={className} />;
  }
};

const getCategoryLabel = (category: EquipmentCategory) => {
  switch (category) {
    case 'SUBSHELF': return 'FRAME';
    case 'CIRCUIT_BREAKER_PANEL': return 'PANEL';
    default: return category;
  }
};

const TreeItem = ({ item, depth = 0, onSelect }: { item: TAPIEquipment, depth?: number, onSelect?: (item: TAPIEquipment) => void }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const hasChildren = (item.children && item.children.length > 0) || (item.holders && item.holders.length > 0);

  return (
    <div className="flex flex-col">
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (onSelect) onSelect(item);
        }}
        className={`
          flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all
          ${depth === 0 ? 'bg-white/5 mb-1' : 'hover:bg-white/5'}
          group
        `}
      >
        <div style={{ width: `${depth * 12}px` }} />

        {hasChildren ? (
          isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />
        ) : (
          <div className="w-3" />
        )}

        <CategoryIcon category={item.category} className={`w-4 h-4 ${isOpen ? 'text-accent-primary' : 'text-slate-500'} group-hover:text-accent-primary transition-colors`} />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black uppercase tracking-tight text-white group-hover:text-accent-primary">
              {item.name}
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/5 text-slate-500 uppercase tracking-widest">
              {getCategoryLabel(item.category)}
            </span>
          </div>
          {item.sn && (
            <span className="text-[10px] font-mono text-slate-500 -mt-0.5">SN: {item.sn}</span>
          )}
        </div>

        {item.category === 'BREAKER' && (
          <Activity className="w-3 h-3 text-success ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {isOpen && (
        <div className="flex flex-col">
          {item.children?.map(child => (
            <TreeItem key={child.id} item={child} depth={depth + 1} onSelect={onSelect} />
          ))}

          {/* Renderización de Holders (Espacios Vacíos) */}
          {item.holders?.map(holder => (
            <div key={holder.id} className="flex flex-col">
              {holder.occupiedBy ? (
                <TreeItem item={holder.occupiedBy} depth={depth + 1} onSelect={onSelect} />
              ) : (
                <div className="flex items-center gap-2 py-1.5 px-3 opacity-30">
                  <div style={{ width: `${(depth + 1) * 12 + 12}px` }} />
                  <Square className="w-4 h-4 text-slate-600 border-dashed" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 italic">
                    {holder.name} [VACÍO]
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WrapperNode = ({ name, category, depth, children }: { name: string, category: string, depth: number, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="flex flex-col">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-white/5 group`}
      >
        <div style={{ width: `${depth * 12}px` }} />
        {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        <CategoryIcon category={category} className={`w-4 h-4 ${isOpen ? 'text-accent-primary' : 'text-slate-500'} group-hover:text-accent-primary transition-colors`} />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-tight text-white group-hover:text-accent-primary">
              {name}
            </span>
            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/5 text-slate-500 uppercase tracking-widest">
              {category}
            </span>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="flex flex-col">
          {children}
        </div>
      )}
    </div>
  );
};

interface BayData {
  id: string;
  name: string;
  equipment?: TAPIEquipment[];
}

interface InfrastructureExplorerProps {
  equipment: TAPIEquipment[];
  siteName?: string;
  roomName?: string;
  bays?: BayData[];
  onSelect?: (item: TAPIEquipment) => void;
}

const InfrastructureExplorer: React.FC<InfrastructureExplorerProps> = ({
  equipment,
  siteName = "Site Principal",
  roomName = "Sala de Transmisiones",
  bays = [],
  onSelect
}) => {
  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto max-h-full scrollbar-thin scrollbar-thumb-white/10">
      <WrapperNode name={siteName} category="SITE" depth={0}>
        <WrapperNode name="Building 1" category="STRUCTURE" depth={1}>
          <WrapperNode name={roomName} category="ROOM" depth={2}>
            {bays.length > 0 ? (
              bays.map(bay => (
                <WrapperNode key={bay.id} name={bay.name} category="BAY" depth={3}>
                  {(bay.equipment || []).length > 0 ? (
                    bay.equipment?.map(item => (
                      <TreeItem key={item.id} item={item} depth={4} onSelect={onSelect} />
                    ))
                  ) : ''}
                </WrapperNode>
              ))
            ) : (
              <div className="p-8 text-center opacity-20 flex flex-col items-center gap-2">
                <Layers className="w-8 h-8" />
                <span className="text-[10px] uppercase font-black tracking-widest leading-none">Sin Bahías definidas en la sala</span>
              </div>
            )}
          </WrapperNode>
        </WrapperNode>
      </WrapperNode>
    </div>
  );
};

export default InfrastructureExplorer;
