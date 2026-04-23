"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, MapPin, Building2, DoorOpen, Layers, ArrowRight, Database, Activity, Search, X } from 'lucide-react';
import SiteDashboardView from './SiteDashboardView';
import WarehouseInventoryView from './WarehouseInventoryView';
import StructureDashboardView from './StructureDashboardView';
import RoomView from './RoomView';
import MasterInventoryTree from './MasterInventoryTree';
import { useMqtt } from '@/lib/MqttContext';
import { useAuth } from '@/lib/AuthContext';
import Swal from 'sweetalert2';

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
  const [selectedSiteName, setSelectedSiteName] = useState<string | null>(null);
  const [selectedStructureName, setSelectedStructureName] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const { isAdmin, isTechnician } = useAuth();

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/appm-ems/api/sites/');
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
      const res = await fetch('/appm-ems/api/sites/', {
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
    setSelectedSiteId(null);
    setSelectedSiteName(null);
    setSelectedStructureId(null);
    setSelectedStructureName(null);
    setSelectedRoomId(null);
    setSelectedRoomName(null);
  };

  const selectSite = (site: any) => {
    setSelectedSiteId(site.id);
    setSelectedSiteName(site.alias || site.name);
    setViewMode('SITE');

    // CRITICAL: CLEAR DEEPER STATES TO FIX BREADCRUMB BUG
    setSelectedStructureId(null);
    setSelectedStructureName(null);
    setSelectedRoomId(null);
    setSelectedRoomName(null);
  };

  const navigateToStructure = (id: string, name?: string) => {
    setSelectedStructureId(id);
    if (name) setSelectedStructureName(name);
    setViewMode('STRUCTURE');

    // CLEAR DEEPER ROOM STATE
    setSelectedRoomId(null);
    setSelectedRoomName(null);
  };

  const navigateToRoom = (id: string, name?: string) => {
    setSelectedRoomId(id);
    if (name) setSelectedRoomName(name);
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
                alias: fd.get('alias'),
                description: fd.get('description'),
                geoCoords: fd.get('geoCoords'),
                address: fd.get('address')
              });
            }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Site Name</label>
                  <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all placeholder:text-slate-700 uppercase" placeholder="Ej: LURIN GATEWAY" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Internal Alias</label>
                  <input name="alias" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all placeholder:text-slate-700 uppercase" placeholder="Ej: LURIN-MAIN-01" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Operational Description</label>
                <textarea name="description" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:border-sky-500 outline-none transition-all placeholder:text-slate-700 uppercase min-h-[80px]" placeholder="Detailed site operations and access info..." />
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
            <h1 className="font-black text-xl tracking-tighter text-white uppercase italic">APPM <span className="text-sky-400 not-italic">TWIN</span></h1>
          </div>

          {/* DYNAMIC BREADCRUMBS */}
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <button
              onClick={navigateToSite}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${!selectedSiteId ? 'bg-sky-500 text-black' : 'text-slate-500 hover:text-white'}`}
            >
              <Home className="w-3.5 h-3.5" /> ROOT
            </button>

            {selectedSiteId && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <button
                  onClick={() => {
                    setViewMode('SITE');
                    setSelectedStructureId(null);
                    setSelectedStructureName(null);
                    setSelectedRoomId(null);
                    setSelectedRoomName(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'SITE' ? 'bg-sky-500 text-black shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:text-white'}`}
                >
                  <MapPin className="w-3.5 h-3.5" /> {selectedSiteName || 'SITE'}
                </button>
              </>
            )}

            {selectedStructureId && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <button
                  onClick={() => navigateToStructure(selectedStructureId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'STRUCTURE' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-white'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> {selectedStructureName || 'BUILDING'}
                </button>
              </>
            )}

            {selectedRoomId && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-700" />
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-default`}
                >
                  <DoorOpen className="w-3.5 h-3.5" /> {selectedRoomName || 'ROOM'}
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {selectedSiteId && (
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-5 py-2 bg-sky-500/10 hover:bg-sky-500 border border-sky-500/20 rounded-full text-sky-400 hover:text-black transition-all group flex items-center gap-2"
            >
              <Layers className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Audit Inventory</span>
            </button>
          )}
          <MqttIndicator />
          <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-slate-600">
            {isAlmacen ? "MASTER CATALOG MODE" : "ENGINEERING GRADE: MILIMETRIC SYNC"}
          </div>
        </div>
      </div>

      {/* RENDER DYNAMIC VIEW */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* STRUCTURAL AUDIT MODAL */}
        {isAuditModalOpen && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-4xl max-h-[85vh] bg-[#020617] rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="h-20 bg-black/40 border-b border-white/5 flex items-center justify-between px-10 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20">
                    <Layers className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Inventory <span className="text-sky-400">Contextual Audit</span></h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-0.5">Vertical Navigation • Millimetric Precision</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input className="bg-white/5 border border-white/5 rounded-full pl-10 pr-6 py-2 text-[10px] text-white focus:border-sky-500 outline-none w-64 transition-all" placeholder="Global structural search..." />
                  </div>
                  <button onClick={() => setIsAuditModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all group">
                    <X className="w-5 h-5 text-slate-500 group-hover:text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)]">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] overflow-hidden p-6">
                  <MasterInventoryTree
                    limitToSiteId={selectedSiteId}
                    onNavigateSite={(id, name) => { selectSite({ id, name }); setIsAuditModalOpen(false); }}
                    onNavigateStructure={(id, name) => { navigateToStructure(id, name); setIsAuditModalOpen(false); }}
                    onNavigateRoom={(id, name) => { navigateToRoom(id, name); setIsAuditModalOpen(false); }}
                  />
                </div>
              </div>

              <div className="h-16 bg-black/40 border-t border-white/5 flex items-center justify-between px-10 shrink-0 text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] italic text-right">
                <div className="flex-1" />
                <span className="text-sky-500/50 mr-4 tracking-widest uppercase">AppM Physical Layer Graph</span>
              </div>
            </div>
          </div>
        )}

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
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Active Nodes Portfolio </p>
                </div>
                {!isTechnician && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                  >
                    + Add New Emplacement
                  </button>
                )}
              </div>

              {allSites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allSites.map(site => {
                    const isSiteAlmacen = site.name?.toUpperCase().includes('ALMACÉN') || site.name?.toUpperCase().includes('ALMACEN');
                    const Icon = isSiteAlmacen ? Database : MapPin;

                    return (
                      <div
                        key={site.id}
                        onClick={() => selectSite(site)}
                        className={`group relative flex flex-col p-8 bg-white/[0.02] border rounded-[40px] transition-all text-left overflow-hidden cursor-pointer ${isSiteAlmacen ? 'border-amber-500/20 hover:bg-amber-500/5 hover:border-amber-500/40' : 'border-white/10 hover:bg-sky-500/5 hover:border-sky-500/40 shadow-xl'}`}
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
                          <div className="flex items-center gap-4">
                            {isAdmin && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const result = await Swal.fire({
                                    title: '¿Eliminar Emplazamiento?',
                                    text: `Esta acción no se puede deshacer. Se verificará que el sitio esté vacío.`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    cancelButtonColor: 'rgba(255,255,255,0.05)',
                                    confirmButtonText: 'ELIMINAR',
                                    background: '#020617',
                                    color: '#fff'
                                  });

                                  if (result.isConfirmed) {
                                    const res = await fetch(`/appm-ems/api/sites/?id=${site.id}`, { method: 'DELETE' });
                                    const data = await res.json();
                                    if (data.ok) {
                                      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Site eliminado', showConfirmButton: false, timer: 2000, background: '#020617', color: '#fff' });
                                      fetchSites();
                                    } else {
                                      Swal.fire({ icon: 'error', title: 'Error de Eliminación', text: data.error, background: '#020617', color: '#fff' });
                                    }
                                  }
                                }}
                                className="p-2 hover:bg-rose-500/10 rounded-lg group/trash transition-all"
                              >
                                <X className="w-3.5 h-3.5 text-slate-700 group-hover/trash:text-rose-500" />
                              </button>
                            )}
                            <ArrowRight className={`w-4 h-4 transform group-hover:translate-x-1 transition-transform ${isSiteAlmacen ? 'text-amber-500' : 'text-sky-400'}`} />
                          </div>
                        </div>
                      </div>
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
                siteDimensions={{ width: selectedSite?.width, length: selectedSite?.length }}
              />
            )}

            {viewMode === 'ROOM' && selectedRoomId && (
              <RoomView
                substructureId={selectedRoomId}
                siteDimensions={{ width: selectedSite?.width, length: selectedSite?.length }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
