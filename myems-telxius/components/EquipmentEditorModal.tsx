"use client";

import React, { useState } from 'react';
import { X, Plus, Trash2, Cpu, Save, AlertCircle, FileJson, LayoutGrid, Zap } from 'lucide-react';
import Swal from 'sweetalert2';

interface EquipmentEditorModalProps {
    device: any;
    onClose: () => void;
    onUpdate: () => void;
}

export default function EquipmentEditorModal({ device, onClose, onUpdate }: EquipmentEditorModalProps) {
    const [equipments, setEquipments] = useState(device.equipments || []);
    const [ports, setPorts] = useState(device.ports || []);
    const [activeTab, setActiveTab] = useState<'panels' | 'ports'>('panels');
    const [isSaving, setIsSaving] = useState(false);

    const handleImportJson = async () => {
        const { value: json } = await Swal.fire({
            title: 'Importar Configuración JSON',
            input: 'textarea',
            inputPlaceholder: '{ "equipments": [...], "ports": [...] }',
            showCancelButton: true,
            background: '#0f172a',
            color: '#fff',
            confirmButtonColor: '#0ea5e9'
        });

        if (json) {
            try {
                const config = JSON.parse(json);
                setIsSaving(true);

                if (config.equipments) {
                    const eqPayload = config.equipments.map((e: any) => ({ ...e, deviceName: device.name }));
                    await fetch('/telxius/api/bulk/equipments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(eqPayload)
                    });
                }

                if (config.ports) {
                    await fetch('/telxius/api/bulk/ports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(config.ports)
                    });
                }

                Swal.fire('Éxito', 'Configuración importada correctamente', 'success');
                onUpdate();
                onClose();
            } catch (e) {
                Swal.fire('Error', 'JSON inválido', 'error');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleAddPanel = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Configurar Nuevo Panel',
            html: `
                <div class="text-left space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nombre del Panel</label>
                            <input id="swal-panel-name" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" placeholder="Ej: Panel-A1">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 text-sky-400">Prefijo Lógico (0_N_)</label>
                            <input id="swal-panel-prefix" class="w-full bg-black/40 border border-sky-500/30 rounded-xl px-4 py-2 text-white text-sm font-mono" placeholder="Ej: 0_1_">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Posición U</label>
                            <input id="swal-panel-u" type="number" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" value="1">
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Altura (U)</label>
                            <input id="swal-panel-h" type="number" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" value="2">
                        </div>
                    </div>
                    <div class="p-3 bg-sky-500/5 border border-sky-500/10 rounded-xl flex items-center gap-3">
                       <input type="checkbox" id="swal-panel-gen" class="w-4 h-4 accent-sky-500" checked>
                       <label for="swal-panel-gen" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autogenerar 24 Breakers (Usará el prefijo)</label>
                    </div>
                </div>
            `,
            focusConfirm: false,
            background: '#0f172a',
            color: '#fff',
            confirmButtonText: 'AGREGAR PANEL',
            confirmButtonColor: '#0ea5e9',
            showCancelButton: true,
            cancelButtonColor: '#334155',
            preConfirm: () => {
                return {
                    name: (document.getElementById('swal-panel-name') as HTMLInputElement).value,
                    prefix: (document.getElementById('swal-panel-prefix') as HTMLInputElement).value,
                    u: (document.getElementById('swal-panel-u') as HTMLInputElement).value,
                    h: (document.getElementById('swal-panel-h') as HTMLInputElement).value,
                    autoGen: (document.getElementById('swal-panel-gen') as HTMLInputElement).checked
                }
            }
        });

        if (formValues && formValues.name) {
            try {
                const res = await fetch('/telxius/api/equipments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formValues.name,
                        unitPosition: parseInt(formValues.u),
                        unitHeight: parseInt(formValues.h),
                        logicalPrefix: formValues.prefix,
                        deviceId: device.id,
                        category: 'SUBRACK'
                    })
                });

                if (res.ok) {
                    const newEq = await res.json();
                    const equipmentId = newEq.data.id;

                    if (formValues.autoGen && formValues.prefix) {
                        const portsToCreate = Array.from({ length: 24 }).map((_, i) => ({
                            name: `Breaker-${i + 1}`,
                            type: 'POWER_OUT',
                            sensorTopic: `${formValues.prefix}${i + 1}`,
                            equipmentId: equipmentId,
                            deviceId: device.id
                        }));

                        await fetch('/telxius/api/bulk/ports', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(portsToCreate)
                        });
                    }

                    setEquipments([...equipments, newEq.data]);
                    onUpdate();
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleAddPort = async () => {
        if (equipments.length === 0) {
            Swal.fire('Error', 'Debe existir al menos un panel para agregar un puerto', 'warning');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'Mapeo de Nuevo Puerto',
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Panel de Origen</label>
                        <select id="swal-port-eq" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
                            ${equipments.map((e: any) => `<option value="${e.id}">${e.name} (Prefix: ${e.logicalPrefix || 'None'})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nombre o Número de Breaker</label>
                        <input id="swal-port-name" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" placeholder="Ej: Breaker-1">
                    </div>
                </div>
            `,
            focusConfirm: false,
            background: '#0f172a',
            color: '#fff',
            confirmButtonText: 'CONFIRMAR MAPEO',
            confirmButtonColor: '#0ea5e9',
            showCancelButton: true,
            cancelButtonColor: '#334155',
            preConfirm: () => {
                return {
                    eqId: (document.getElementById('swal-port-eq') as HTMLSelectElement).value,
                    name: (document.getElementById('swal-port-name') as HTMLInputElement).value
                }
            }
        });

        if (formValues && formValues.name) {
            try {
                const selectedEq = equipments.find((e: any) => e.id === formValues.eqId);
                const prefix = selectedEq?.logicalPrefix || "";
                const numMatch = formValues.name.match(/\d+/);
                const suffix = numMatch ? numMatch[0] : "0";
                const calculatedTopic = prefix ? `${prefix}${suffix}` : null;

                const res = await fetch('/telxius/api/ports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formValues.name,
                        equipmentId: formValues.eqId,
                        deviceId: device.id,
                        type: 'POWER_OUT',
                        sensorTopic: calculatedTopic
                    })
                });
                if (res.ok) {
                    const newPort = await res.json();
                    setPorts([...ports, newPort.data]);
                    onUpdate();
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleDeletePanel = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: '¿Eliminar Panel?',
            text: `Se eliminará el ${name} y todos sus puertos asociados.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Sí, eliminar',
            background: '#0f172a',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/telxius/api/equipments?id=${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    setEquipments(equipments.filter((e: any) => e.id !== id));
                    onUpdate();
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-sky-500/20 rounded-2xl border border-sky-500/30">
                            <Cpu className="w-6 h-6 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase italic tracking-widest">{device.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">S/N:</p>
                                <input 
                                    defaultValue={device.serialNumber || ''} 
                                    onBlur={async (e) => {
                                        const newSn = e.target.value;
                                        if (newSn === device.serialNumber) return;
                                        try {
                                            await fetch(`/telxius/api/devices/?id=${device.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ serialNumber: newSn })
                                            });
                                            Swal.fire({
                                                toast: true,
                                                position: 'top-end',
                                                icon: 'success',
                                                title: 'S/N Vinculado',
                                                showConfirmButton: false,
                                                timer: 1500,
                                                background: '#0f172a',
                                                color: '#fff'
                                            });
                                        } catch (e) {
                                            console.error("Error updating SN", e);
                                        }
                                    }}
                                    className="bg-sky-500/5 border border-sky-500/20 rounded px-2 py-0.5 text-[10px] font-mono text-sky-400 focus:border-sky-500 outline-none w-40"
                                    placeholder="Click para asignar SN..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleImportJson} className="p-2 hover:bg-white/5 rounded-full transition-colors text-sky-400">
                            <FileJson className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="px-8 bg-black/20 flex gap-8 border-b border-white/5">
                    <button onClick={() => setActiveTab('panels')} className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'panels' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Paneles y Módulos</button>
                    <button onClick={() => setActiveTab('ports')} className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ports' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Puertos y Sensores</button>
                </div>

                <div className="flex-1 p-8 overflow-auto custom-scrollbar">
                    {activeTab === 'panels' ? (
                        <>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Paneles Instalados ({equipments.length})</h3>
                                <button onClick={handleAddPanel} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"><Plus className="w-4 h-4" /> Agregar Panel</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                {equipments.map((eq: any) => (
                                    <div key={eq.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
                                                <div className="w-4 h-2 bg-sky-500/40 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.3)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase">{eq.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">U{eq.unitPosition || '?'} • {eq.category}</p>
                                                {eq.logicalPrefix && <p className="text-[8px] text-sky-400 font-black font-mono mt-1 opacity-80">Prefix: {eq.logicalPrefix}</p>}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeletePanel(eq.id, eq.name)} className="p-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            {equipments.length === 0 && <div className="py-20 text-center opacity-40"><p className="text-xs font-bold uppercase tracking-widest italic">Chasis Vacío</p></div>}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Puertos y Mapeo ({ports.length})</h3>
                                <button onClick={handleAddPort} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"><Plus className="w-4 h-4" /> Agregar Puerto</button>
                            </div>
                            <div className="space-y-3">
                                {ports.map((port: any) => (
                                    <div key={port.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5"><Zap className={`w-4 h-4 ${port.sensorTopic ? 'text-emerald-500' : 'text-slate-600'}`} /></div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase">{port.name}</p>
                                                {port.sensorTopic && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded border border-emerald-500/20">{port.sensorTopic}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-black/40 flex justify-end">
                    <button onClick={onClose} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">Cerrar Configuración</button>
                </div>
            </div>
        </div>
    );
}
