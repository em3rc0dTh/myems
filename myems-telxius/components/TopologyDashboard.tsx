"use client";

import React, { useState } from 'react';
import { ChevronRight, Home, MapPin, Building2, DoorOpen, Layers, ArrowRight, Database } from 'lucide-react';
import SiteDashboardView from './SiteDashboardView';
import WarehouseInventoryView from './WarehouseInventoryView';
import StructureDashboardView from './StructureDashboardView';
import RoomView from './RoomView';
import { useMqtt } from '@/lib/MqttContext';
import { Activity } from 'lucide-react';

type ViewMode = 'SITE' | 'STRUCTURE' | 'ROOM';

function MqttIndicator() {
  const { isConnected, latestData } = useMqtt();
  const dataCount = Object.keys(latestData).length;

  return (
    <div className="flex items-center gap-2.5 px-4 py-1.5 bg-black/20 rounded-full border border-white/5 ring-1 ring-white/5">
      <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
      <div className="flex items-center gap-1.5">
        <Activity className={`w-3 h-3 ${isConnected ? 'text-sky-400' : 'text-slate-600'}`} />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {isConnected ? `Live: ${dataCount} Nodes` : 'MQTT Offline'}
        </span>
      </div>
    </div>
  );
}

export default function TopologyDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('SITE');
  const [allSites, setAllSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/telxius/api/sites/');
      const data = await res.json();
      if (data.ok) {
        setAllSites(data.data);
      }
    } catch (e) {
      console.error("Failed to load sites", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (formData: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/telxius/api/sites/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchSites();
        setIsCreateModalOpen(false);
      }
    } catch (e) {
      console.error("Failed to create site", e);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSite = allSites.find(s => s.id === selectedSiteId);
  const isAlmacen = selectedSite?.name?.toUpperCase().includes('ALMACÉN') || selectedSite?.name?.toUpperCase().includes('ALMACEN');

  // Load all sites on mount
  React.useEffect(() => {
    fetchSites();
  }, []);

  // Breadcrumb navigation
  const navigateToSite = () => {
    setViewMode('SITE');
    setSelectedSiteId(null); // Go back to selection screen
    setSelectedStructureId(null);
    setSelectedRoomId(null);
  };

  const navigateToStructure = (id: string) => {
    setSelectedStructureId(id);
    setViewMode('STRUCTURE');
    setSelectedRoomId(null);
  };

  const navigateToRoom = (id: string) => {
    setSelectedRoomId(id);
    setViewMode('ROOM');
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* MODAL CREACION SITE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-panel rounded-[32px] border border-white/10 p-8 shadow-2xl relative overflow-hidden text-left bg-[#0f172a]">
            <div className="absolute top-0 left-0 w-full h-1 bg-sky-500" />
            <h2 className="text-xl font-black text-white uppercase italic tracking-[0.15em] mb-2 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-sky-500" /> New Emplacement
            </h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-8">Layer 1 Physical Infrastructure</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleCreateSite({
                name: fd.get('name'),
                address: fd.get('address')
              });
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Site Name</label>
                <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all placeholder:text-slate-700 uppercase" placeholder="Ej: LURIN GATEWAY" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Geo Coordinates</label>
                  <input name="geoCoords" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all placeholder:text-slate-700 uppercase" placeholder="-12.284853, -76.847167" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Geographic Address</label>
                  <input name="address" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all placeholder:text-slate-700 uppercase" placeholder="P583+356, Lima..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Width (m)</label>
                  <input name="width" type="number" defaultValue={100} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Length (m)</label>
                  <input name="length" type="number" defaultValue={100} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all" />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all">Cancel</button>
                <button type="submit" onClick={(e) => {
                  const form = e.currentTarget.closest('form');
                  if (form) {
                    e.preventDefault();
                    const fd = new FormData(form);
                    handleCreateSite({
                      name: fd.get('name'),
                      address: fd.get('address'),
                      geoCoords: fd.get('geoCoords'),
                      width: parseFloat(fd.get('width') as string),
                      length: parseFloat(fd.get('length') as string)
                    });
                  }
                }} disabled={isSaving} className="flex-[2] py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                  {isSaving ? 'Synchronizing...' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER TOP BAR / BREADCRUMBS */}
      <div className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 relative z-[100] shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-6 border-r border-white/10">
            <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <Layers className="w-5 h-5 text-sky-400" />
            </div>
            <h1 className="font-black text-xl tracking-tighter text-white uppercase italic">TELXIUS <span className="text-sky-400 not-italic">TWIN</span></h1>
          </div>

          {/* DYNAMIC BREADCRUMBS */}
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <button
              onClick={navigateToSite}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'SITE' ? 'bg-sky-500 text-black' : 'text-slate-500 hover:text-white'}`}
            >
              <Home className="w-3.5 h-3.5" /> SITE
            </button>

            {selectedStructureId && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <button
                  onClick={() => navigateToStructure(selectedStructureId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'STRUCTURE' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> BUILDING
                </button>
              </>
            )}

            {selectedRoomId && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]`}
                >
                  <DoorOpen className="w-3.5 h-3.5" /> ROOM
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <MqttIndicator />
          <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-slate-600">
             {isAlmacen ? "MASTER CATALOG MODE" : "ENGINEERING GRADE: MILIMETRIC SYNC"}
          </div>
        </div>
      </div>

      {/* RENDER DYNAMIC VIEW */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20 text-center bg-black/40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : !selectedSiteId ? (
          <div className="flex-1 flex flex-col p-12 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent)] overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Select Your <span className="text-sky-400">Emplacement</span></h2>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Active Nodes Portfolio • Telxius Latin America</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                >
                  + Add New Emplacement
                </button>
              </div>

              {allSites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allSites.map(site => {
                    const isSiteAlmacen = site.name?.toUpperCase().includes('ALMACÉN') || site.name?.toUpperCase().includes('ALMACEN');
                    const Icon = isSiteAlmacen ? Database : MapPin;
                    
                    return (
                      <button
                        key={site.id}
                        onClick={() => setSelectedSiteId(site.id)}
                        className={`group relative flex flex-col p-8 bg-white/[0.02] border rounded-[40px] transition-all text-left overflow-hidden ${isSiteAlmacen ? 'border-amber-500/20 hover:bg-amber-500/5 hover:border-amber-500/40' : 'border-white/5 hover:bg-sky-500/5 hover:border-sky-500/40'}`}
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                          <Icon className="w-20 h-20" />
                        </div>
                        <div className={`p-3 rounded-2xl border w-fit mb-6 transition-all ${isSiteAlmacen ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black' : 'bg-sky-500/10 border-sky-500/20 group-hover:bg-sky-500 group-hover:text-black'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        {isSiteAlmacen && (
                          <div className="mb-4">
                            <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-[7px] font-black text-amber-500 uppercase tracking-[0.2em]">
                              ALMACÉN TÉCNICO • CATALOG
                            </span>
                          </div>
                        )}

                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">{site.name}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">{isSiteAlmacen ? 'Repositorio de Plantillas Maestras' : (site.address || 'Geo-Location Pending')}</p>
  
                        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-6">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isSiteAlmacen ? 'text-amber-500' : 'text-sky-400'}`}>
                            {isSiteAlmacen ? 'Gestionar Plantillas' : 'Enter Master Plan'}
                          </span>
                          <ArrowRight className={`w-4 h-4 transform group-hover:translate-x-1 transition-transform ${isSiteAlmacen ? 'text-amber-500' : 'text-sky-400'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-black/20 rounded-[40px] border border-white/5 border-dashed">
                  <Layers className="w-12 h-12 text-slate-700 mb-6" />
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-400 mb-2">No active sites found</h3>
                  <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest max-w-xs mb-8">
                    Usa el Ingestion Wizard para cargar la Capa 1 de tu infraestructura y habilitar el Digital Twin.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'SITE' && (
              isAlmacen ? (
                <WarehouseInventoryView siteId={selectedSiteId} />
              ) : (
                <SiteDashboardView
                  siteId={selectedSiteId}
                  onStructureSelect={navigateToStructure}
                />
              )
            )}

            {viewMode === 'STRUCTURE' && selectedStructureId && (
              <StructureDashboardView
                structureId={selectedStructureId}
                onRoomSelect={navigateToRoom}
              />
            )}

            {viewMode === 'ROOM' && selectedRoomId && (
              <RoomView substructureId={selectedRoomId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
