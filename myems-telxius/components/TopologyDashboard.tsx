"use client";

import React, { useState } from 'react';
import { ChevronRight, Home, MapPin, Building2, DoorOpen, Layers, ArrowRight } from 'lucide-react';
import SiteDashboardView from './SiteDashboardView';
import StructureDashboardView from './StructureDashboardView';
import RoomView from './RoomView';

type ViewMode = 'SITE' | 'STRUCTURE' | 'ROOM';

export default function TopologyDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('SITE');
  const [allSites, setAllSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all sites on mount
  React.useEffect(() => {
    const fetchSites = async () => {
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
          <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            ENGINEERING GRADE: <span className="text-emerald-400">MILIMETRIC SYNC</span>
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
                  onClick={() => window.location.href = '/topology'}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5 transition-all"
                >
                  + Add New Emplacement
                </button>
              </div>

              {allSites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allSites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSiteId(site.id)}
                      className="group relative flex flex-col p-8 bg-white/[0.02] border border-white/5 rounded-[40px] hover:bg-sky-500/5 hover:border-sky-500/40 transition-all text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                        <MapPin className="w-20 h-20" />
                      </div>
                      <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 w-fit mb-6 group-hover:bg-sky-500 group-hover:text-black transition-all">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">{site.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">{site.address || 'Geo-Location Pending'}</p>

                      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-6">
                        <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Enter Master Plan</span>
                        <ArrowRight className="w-4 h-4 text-sky-400 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
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
              <SiteDashboardView
                siteId={selectedSiteId}
                onStructureSelect={navigateToStructure}
              />
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
