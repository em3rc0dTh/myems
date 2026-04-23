"use client"
import React, { useState, useEffect } from 'react';
import { X, Cpu, Server, Layers, Plus, Save, Trash2, Activity, Info, ExternalLink, Settings, FileJson } from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import RackElevation from './RackElevation';
import EquipmentEditorModal from './EquipmentEditorModal';

interface RackElevationManagerProps {
  container: any;
  siteId?: string;
  onClose: () => void;
  onUpdate?: () => void;
}

const RackElevationManager: React.FC<RackElevationManagerProps> = ({ container, siteId, onClose, onUpdate }) => {
  const { isAdmin } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [selectedDeviceForEdit, setSelectedDeviceForEdit] = useState<any | null>(null);

  // Derive capacity from container metadata
  const totalU = container.uCapacity || (container.spatialMetadata ? (typeof container.spatialMetadata === 'string' ? JSON.parse(container.spatialMetadata).uCapacity : container.spatialMetadata.uCapacity) : 42);

  useEffect(() => {
    fetchData();
  }, [container.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get devices already in this container
      const res = await fetch(`/telxius/api/devices/?containerId=${container.id}`);
      const data = await res.json();
      setDevices(data.data || []);

      // Get orphaned devices (Real ones in this site OR Catalog ones in Warehouse)
      const orphanRes = await fetch(`/telxius/api/devices/?orphaned=true`);
      const orphanData = await orphanRes.json();
      setAvailableDevices(orphanData.data || []);

      // Get Site Name
      if (siteId) {
        const siteRes = await fetch(`/telxius/api/sites/?id=${siteId}`);
        const siteData = await siteRes.json();
        if (siteData.data) setSiteName(siteData.data.name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMountDevice = async (deviceId: string, startU: number, name?: string, jsonConfig?: string, sn?: string) => {
    try {
      const deviceToMount = availableDevices.find(d => d.id === deviceId);
      const isWarehouse = deviceToMount?.site?.name === 'ALMACÉN CENTRAL'; 
      
      const method = isWarehouse ? 'POST' : 'PATCH';
      const payload: any = {
        id: deviceId,
        containerId: container.id,
        uPosition: startU,
        sn: sn || undefined
      };

      if (method === 'POST') {
        payload.templateId = deviceId;
        payload.siteId = siteId || container.siteId;
        if (name) payload.name = name;
      }

      const res = await fetch(`/telxius/api/devices/`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const createdDevice = (await res.json()).data;
        
        // Handle Advanced JSON Config if provided
        if (jsonConfig && createdDevice) {
           try {
              const config = JSON.parse(jsonConfig);
              
              // 1. Process Equipments
              if (config.equipments && Array.isArray(config.equipments)) {
                const eqPayload = config.equipments.map((e: any) => ({ ...e, deviceName: createdDevice.name }));
                await fetch('/telxius/api/bulk/equipments/', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(eqPayload)
                });
              }

              // 2. Process Ports
              if (config.ports && Array.isArray(config.ports)) {
                await fetch('/telxius/api/bulk/ports/', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(config.ports)
                });
              }
           } catch (e) {
              console.error("Error processing JSON config", e);
           }
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Equipo Montado',
          showConfirmButton: false,
          timer: 2000,
          background: '#020617',
          color: '#fff'
        });
        fetchData();
        onUpdate?.();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnmount = async (deviceId: string) => {
    const result = await Swal.fire({
        title: '¿Desmontar Equipo?',
        text: "El equipo quedará huérfano pero no se eliminará.",
        icon: 'warning',
        showCancelButton: true,
        background: '#020617',
        color: '#fff',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Sí, desmontar'
    });

    if (result.isConfirmed) {
        await handleMountDevice(deviceId, 0); // Logic: containerId null
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[650px] bg-[#020617]/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="h-20 px-6 border-b border-white/5 flex items-center justify-between bg-black/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
            <Layers className="w-3 h-3" />
            <span>Rack Elevation Manager</span>
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">{container.name}</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400"><X /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col sm:flex-row gap-6 custom-scrollbar">
        {/* RACK VISUALIZATION (LEFT/TOP) */}
        <div className="w-full sm:w-[130px] shrink-0 bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[600px] sm:h-[calc(100vh-180px)]">
            <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Elevación Frontal</span>
                <span className="text-[9px] font-black text-blue-400">{totalU}U</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-[#050508]">
                <RackElevation 
                    equipments={devices} 
                    maxUnits={totalU} 
                    onSelect={(id) => {
                        const dev = devices.find(d => d.id === id);
                        if (dev) setSelectedDeviceForEdit(dev);
                    }}
                />
            </div>
        </div>

        {/* DEVICE LIST & CONTROLS (RIGHT) */}
        <div className="flex-1 flex flex-col gap-4">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Cpu className="w-3 h-3" /> Info del Contenedor
             </h4>
             <div className="space-y-2">
                <InfoLine label="Tipo" value={container.type} />
                <InfoLine label="Dimensiones" value={`${Number(container.width || 0).toFixed(1)} x ${Number(container.depth || 0).toFixed(1)} cm`} />
                <InfoLine label="Ocupación" value={`${Math.round((devices.length / totalU) * 100)}%`} />
             </div>
           </div>

           <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Equipos Montados</h4>
                {isAdmin && (
                  <button 
                      onClick={() => setShowAddModal(true)}
                      className="p-1.5 bg-blue-500 rounded-lg text-black hover:bg-blue-400 transition-all shadow-lg"
                  >
                      <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {devices.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                        <Activity className="w-8 h-8 text-slate-800 mx-auto mb-3" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rack Vacío</p>
                    </div>
                ) : (
                    devices.map(dev => (
                        <div key={dev.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                            <Link href={`/bdfb/${dev.id}`} className="flex-1 flex items-center gap-3 cursor-pointer">
                                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20">
                                    <Server className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] font-black text-white italic tracking-tighter uppercase group-hover:text-blue-400 transition-colors">{dev.name}</p>
                                        <ExternalLink className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">U{dev.uPosition} • {dev.category || dev.type}</p>
                                </div>
                            </Link>
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                  <button 
                                      onClick={() => setSelectedDeviceForEdit(dev)}
                                      title="Configurar Componentes"
                                      className="p-2 opacity-0 group-hover:opacity-100 hover:text-blue-400 transition-all"
                                  >
                                      <Settings className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnmount(dev.id); }}
                                      title="Desmontar"
                                      className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all relative z-10"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                            )}
                        </div>
                    ))
                )}
              </div>
           </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-6 border-t border-white/5 bg-black/60 flex gap-3">
         <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all border border-white/5">
            Reporte PDF
         </button>
         {isAdmin && (
           <button 
             onClick={async () => {
               const result = await Swal.fire({
                 title: '¿Eliminar Contenedor?',
                 text: "Se verificará que el rack esté vacío antes de proceder.",
                 icon: 'warning',
                 showCancelButton: true,
                 confirmButtonColor: '#ef4444',
                 confirmButtonText: 'ELIMINAR RACK',
                 background: '#020617',
                 color: '#fff'
               });

               if (result.isConfirmed) {
                 const res = await fetch(`/telxius/api/containers/?id=${container.id}`, { method: 'DELETE' });
                 const data = await res.json();
                 if (data.ok) {
                   Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Rack eliminado', showConfirmButton: false, timer: 2000, background: '#020617', color: '#fff' });
                   onUpdate?.();
                   onClose();
                 } else {
                   Swal.fire({ icon: 'error', title: 'Error', text: data.error, background: '#020617', color: '#fff' });
                 }
               }
             }}
             className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
           >
             Eliminar Rack
           </button>
         )}
      </div>

      {/* COMPONENT EDITOR MODAL */}
      {selectedDeviceForEdit && (
        <EquipmentEditorModal 
           device={selectedDeviceForEdit} 
           onClose={() => setSelectedDeviceForEdit(null)} 
           onUpdate={() => { fetchData(); }}
        />
      )}

      {/* ADD DEVICE MODAL */}
      {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
              <div className="relative w-full max-w-md bg-[#020617] rounded-3xl border border-white/10 p-8 shadow-2xl overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Montar Equipo</h3>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white"><X /></button>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {availableDevices.length === 0 ? (
                          <p className="text-center py-8 text-slate-500 text-[10px] font-bold uppercase italic tracking-widest">No hay equipos huérfanos disponibles</p>
                      ) : (
                          availableDevices.map(dev => (
                              <button 
                                  key={dev.id}
                                  onClick={async () => {
                                      const isCatalog = dev.site?.name === 'ALMACÉN CENTRAL';
                                      
                                      // Contextual naming logic
                                      const cleanTemplateName = dev.name.split('-TEMPLATE')[0];
                                      const shortSite = siteName ? siteName.split(' ').pop()?.toUpperCase() : '';
                                      const defaultName = isCatalog 
                                        ? `${cleanTemplateName}-${shortSite || 'INST'}-01` 
                                        : dev.name;

                                      const { value: formValues } = await Swal.fire({
                                          title: isCatalog ? 'INSTANCIAR DESDE CATÁLOGO' : 'MONTAR EQUIPO',
                                          html: `
                                            <div class="text-left space-y-4">
                                               <div>
                                                   <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nombre de la Instancia</label>
                                                   <input id="swal-input-name" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" value="${defaultName}" ${!isCatalog ? 'disabled' : ''}>
                                                </div>
                                                <div class="grid grid-cols-2 gap-4">
                                                   <div>
                                                       <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Serial Number (S/N)</label>
                                                       <input id="swal-input-sn" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" placeholder="Opcional">
                                                   </div>
                                                   <div>
                                                       <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Posición Rack (U)</label>
                                                       <input id="swal-input-u" type="number" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" value="1" min="1" max="${totalU}">
                                                   </div>
                                                </div>
                                                <div class="mt-4">
                                                   <div class="flex justify-between items-center mb-1">
                                                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Configuración Avanzada (JSON)</label>
                                                      <span class="text-[8px] text-blue-400 font-bold uppercase italic">Opcional</span>
                                                   </div>
                                                   <textarea id="swal-input-json" class="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[10px] font-mono custom-scrollbar" placeholder='{ "equipments": [...], "ports": [...] }'></textarea>
                                                </div>
                                             </div>
                                           `,
                                          focusConfirm: false,
                                          background: '#020617',
                                          color: '#fff',
                                          width: '500px',
                                          confirmButtonText: 'CONFIRMAR MONTAJE',
                                          confirmButtonColor: '#3b82f6',
                                          showCancelButton: true,
                                          cancelButtonColor: '#1e293b',
                                          preConfirm: () => {
                                            return {
                                              name: (document.getElementById('swal-input-name') as HTMLInputElement).value,
                                              sn: (document.getElementById('swal-input-sn') as HTMLInputElement).value,
                                              u: (document.getElementById('swal-input-u') as HTMLInputElement).value,
                                              json: (document.getElementById('swal-input-json') as HTMLTextAreaElement).value
                                            }
                                          }
                                      });

                                      if (formValues) {
                                          handleMountDevice(dev.id, parseInt(formValues.u), isCatalog ? formValues.name : undefined, formValues.json, formValues.sn);
                                          setShowAddModal(false);
                                      }
                                  }}
                                  className="w-full text-left bg-white/5 hover:bg-blue-500/10 p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
                              >
                                  <div>
                                      <div className="flex items-center gap-2 mb-1">
                                         <p className="font-black text-white uppercase italic tracking-tighter">{dev.name}</p>
                                         {dev.site?.name === 'ALMACÉN CENTRAL' && (
                                             <span className="px-2 py-0.5 bg-blue-500 text-[6px] font-black text-black rounded uppercase tracking-widest">Catálogo</span>
                                         )}
                                      </div>
                                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{dev.type} • ID: {dev.id.substring(0,8)}</p>
                                  </div>
                                  <Plus className="w-4 h-4 text-blue-500" />
                              </button>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const InfoLine = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-[10px] font-bold">
    <span className="text-slate-500 uppercase tracking-widest">{label}</span>
    <span className="text-white italic">{value}</span>
  </div>
);

export default RackElevationManager;
