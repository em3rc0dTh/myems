
"use client"
import React, { useState, useMemo, useEffect } from 'react';
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

const containsId = (item: TAPIEquipment, id: string): boolean => {
  if (item.id === id) return true;
  if (item.children?.some(c => containsId(c, id))) return true;
  if (item.holders?.some(h => h.occupiedBy && containsId(h.occupiedBy, id))) return true;
  return false;
};

const TreeItem = ({ item, depth = 0, onSelect, selectedId }: { item: TAPIEquipment, depth?: number, onSelect?: (item: TAPIEquipment) => void, selectedId?: string | null }) => {
  const isSelected = item.id === selectedId;
  const shouldBeOpen = useMemo(() => {
    if (selectedId && containsId(item, selectedId)) return true;
    return false;
  }, [item, selectedId]);

  const [isOpen, setIsOpen] = useState(depth < 2);

  // Auto-expand if child is selected
  useEffect(() => {
    if (shouldBeOpen) setIsOpen(true);
  }, [shouldBeOpen]);

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
          ${isSelected ? 'bg-accent-primary/20 border-l-2 border-accent-primary' : 'hover:bg-white/5'}
          group
        `}
      >
        <div style={{ width: `${depth * 12}px` }} />

        {hasChildren ? (
          isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />
        ) : (
          <div className="w-3" />
        )}

        <CategoryIcon category={item.category} className={`w-4 h-4 ${isOpen || isSelected ? 'text-accent-primary' : 'text-slate-500'} group-hover:text-accent-primary transition-colors`} />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`text-[15px] font-black uppercase tracking-tight group-hover:text-accent-primary ${isSelected ? 'text-accent-primary' : 'text-white'}`}>
              {item.name}
            </span>
            <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-white/10 text-slate-400 uppercase tracking-widest">
              {getCategoryLabel(item.category as any)}
            </span>
          </div>
          {item.sn && (
            <span className="text-[12px] font-mono text-slate-400 -mt-0.5">SN: {item.sn}</span>
          )}
        </div>

        {item.category === 'BREAKER' && (
          <Activity className="w-3 h-3 text-success ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {isOpen && (
        <div className="flex flex-col animate-in slide-in-from-top-1 duration-200">
          {item.children?.map(child => (
            <TreeItem key={child.id} item={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}

          {/* Renderización de Holders (Espacios Vacíos) */}
          {item.holders?.map(holder => (
            <div key={holder.id} className="flex flex-col">
              {holder.occupiedBy ? (
                <TreeItem item={holder.occupiedBy} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
              ) : (
                <div className="flex items-center gap-2 py-1.5 px-3 opacity-50">
                  <div style={{ width: `${(depth + 1) * 12 + 12}px` }} />
                  <Square className="w-4 h-4 text-slate-500 border-dashed" />
                  <span className="text-[13px] font-black uppercase tracking-widest text-slate-500 italic">
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

const WrapperNode = ({ name, category, depth, children, selectedId, equipmentList }: { name: string, category: string, depth: number, children: React.ReactNode, selectedId?: string | null, equipmentList?: TAPIEquipment[] }) => {
  const shouldBeOpen = useMemo(() => {
    if (!selectedId) return true;
    if (equipmentList?.some(item => containsId(item, selectedId))) return true;
    return false;
  }, [selectedId, equipmentList]);

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (shouldBeOpen) setIsOpen(true);
  }, [shouldBeOpen]);

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
            <span className="text-[13px] font-black uppercase tracking-tight text-white group-hover:text-accent-primary">
              {name}
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/10 text-slate-400 uppercase tracking-widest">
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
  selectedId?: string | null;
}

const InfrastructureExplorer: React.FC<InfrastructureExplorerProps> = ({
  equipment,
  siteName = "Site Principal",
  roomName = "Sala de Transmisiones",
  bays = [],
  onSelect,
  selectedId
}) => {
  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto max-h-full scrollbar-thin scrollbar-thumb-white/10">
      <WrapperNode name={siteName} category="SITE" depth={0} selectedId={selectedId}>
        <WrapperNode name="Building 1" category="STRUCTURE" depth={1} selectedId={selectedId}>
          <WrapperNode name={roomName} category="ROOM" depth={2} selectedId={selectedId}>
            {bays.length > 0 ? (
              bays.map(bay => (
                <WrapperNode
                  key={bay.id}
                  name={bay.name}
                  category="BAY"
                  depth={3}
                  selectedId={selectedId}
                  equipmentList={bay.equipment}
                >
                  {(bay.equipment || []).length > 0 ? (
                    bay.equipment?.map(item => (
                      <TreeItem key={item.id} item={item} depth={4} onSelect={onSelect} selectedId={selectedId} />
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
