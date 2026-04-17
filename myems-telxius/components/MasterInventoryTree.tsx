"use client";

import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, MapPin, Building2, Layers,
  DoorOpen, Database, Monitor, Cpu, Zap, Activity, Info
} from 'lucide-react';

interface TreeItemProps {
  label: string;
  type: string;
  count?: number;
  sn?: string;
  children?: React.ReactNode;
  isInitialOpen?: boolean;
  onSelect?: () => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ label, type, count, sn, children, isInitialOpen = false, onSelect }) => {
  const [isOpen, setIsOpen] = useState(isInitialOpen);

  const getIcon = () => {
    switch (type) {
      case 'SITE': return <MapPin className="w-4 h-4 text-sky-400" />;
      case 'STRUCTURE': return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'LEVEL': return <Layers className="w-4 h-4 text-slate-500" />;
      case 'ROOM': return <DoorOpen className="w-4 h-4 text-emerald-400" />;
      case 'RACK': return <Database className="w-4 h-4 text-indigo-400" />;
      case 'WRAPPER': return <Monitor className="w-4 h-4 text-slate-400 opacity-50" />;
      case 'EQUIPMENT': return <Cpu className="w-4 h-4 text-amber-500" />;
      case 'PORT': return <Zap className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="ml-4 border-l border-white/5 pl-2 mb-1">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all group"
      >
        {children ? (
          isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />
        ) : (
          <div className="w-3" />
        )}

        <div className={`p-1.5 rounded-md bg-white/5 border border-white/5 group-hover:border-white/10`}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-200 uppercase tracking-tighter italic truncate">{label}</span>
            {type && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500 uppercase tracking-widest">{type}</span>
            )}
          </div>
          {sn && (
            <p className="text-[8px] font-mono text-sky-500/80 font-bold mt-0.5">SN: {sn}</p>
          )}
        </div>

        {onSelect && (
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="p-1 px-2 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-black rounded text-[8px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
          >
            GO
          </button>
        )}

        {count !== undefined && (
          <span className="text-[9px] font-black text-slate-600 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">{count}</span>
        )}
      </div>

      {isOpen && children && (
        <div className="mt-1 animate-in slide-in-from-left-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default function MasterInventoryTree({ 
    limitToSiteId,
    onNavigateSite,
    onNavigateStructure,
    onNavigateRoom
  }: { 
    limitToSiteId?: string | null;
    onNavigateSite?: (siteId: string, siteName: string) => void;
    onNavigateStructure?: (id: string, name: string) => void;
    onNavigateRoom?: (id: string, name: string) => void;
  }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/telxius/api/topology/tree/')
      .then(res => res.json())
      .then(json => {
        if (json.ok) {
          let treeData = json.data;
          if (limitToSiteId) {
            treeData = treeData.filter((s: any) => s.id === limitToSiteId);
          }
          setData(treeData);
        }
        setLoading(false);
      });
  }, [limitToSiteId]);

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-center">
        <Activity className="w-10 h-10 text-sky-500 animate-spin mb-4" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Syncing Layers...</h3>
        <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.2em]">Audit in progress</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {data.length === 0 && (
        <div className="p-10 text-center opacity-30">
          <p className="text-[10px] font-black text-slate-500 uppercase italic">No context available</p>
        </div>
      )}
      {data.map(site => (
        <TreeItem 
            key={site.id} 
            label={site.name} 
            type="SITE" 
            count={site.structures?.length} 
            isInitialOpen={true}
            onSelect={onNavigateSite ? () => onNavigateSite(site.id, site.name) : undefined}
        >
          {site.structures?.map((struct: any) => (
            <TreeItem 
                key={struct.id} 
                label={struct.name} 
                type="STRUCTURE"
                onSelect={onNavigateStructure ? () => onNavigateStructure(struct.id, struct.name) : undefined}
            >
              {struct.levels?.map((level: any) => (
                <TreeItem key={level.id} label={level.name} type="LEVEL">
                  {level.rooms?.map((room: any) => (
                    <TreeItem 
                        key={room.id} 
                        label={room.name} 
                        type="ROOM" 
                        count={room.racks?.length}
                        onSelect={onNavigateRoom ? () => onNavigateRoom(room.id, room.name) : undefined}
                    >
                      {room.racks?.map((rack: any) => (
                        <TreeItem key={rack.id} label={rack.name} type="RACK">
                          {rack.devices?.map((dev: any) => (
                            <TreeItem key={dev.id} label={dev.name} type="WRAPPER">
                              {dev.equipments?.map((eq: any) => (
                                <EquipmentNode key={eq.id} equipment={eq} />
                              ))}
                            </TreeItem>
                          ))}
                        </TreeItem>
                      ))}
                    </TreeItem>
                  ))}
                </TreeItem>
              ))}
            </TreeItem>
          ))}
        </TreeItem>
      ))}
    </div>
  );
}

const EquipmentNode = ({ equipment }: { equipment: any }) => {
  return (
    <TreeItem label={equipment.name} type="EQUIPMENT" sn={equipment.sn}>
      {equipment.ports?.map((port: any) => (
        <TreeItem key={port.id} label={port.name} type="PORT" />
      ))}
      {equipment.children?.map((child: any) => (
        <EquipmentNode key={child.id} equipment={child} />
      ))}
    </TreeItem>
  );
};
