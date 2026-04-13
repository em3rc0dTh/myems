"use client";

import React, { useState } from 'react';
import {
  UploadCloud, CheckCircle2, Server, Layout,
  Cpu, Zap, Download, ArrowRight,
  ChevronRight, Box, Activity, FileJson, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PortData {
  id: string;
  name: string;
  sensorTopic: string;
}

interface EquipmentData {
  id: string;
  name: string;
  sn: string;
  ports: PortData[];
}

interface DeviceData {
  id: string;
  name: string;
  equipments: EquipmentData[];
}

interface PositionData {
  id: string;
  row: string;
  col: number;
  device?: DeviceData;
}

interface RackData {
  id: string;
  name: string;
  type: string;
  row: string;
  position: number;
}

interface RoomData {
  id: string;
  name: string;
  racks: RackData[];
  positions: PositionData[];
}

interface LevelData {
  id: string;
  name: string;
  rooms: RoomData[];
}

interface StructureData {
  id: string;
  name: string;
  levels: LevelData[];
}

interface SummaryData {
  name: string;
  structures: StructureData[];
}

const STEPS = [
  {
    id: 'foundation',
    title: 'Capa 1: Site Foundation',
    description: 'Site Perimeter & Dimensions',
    icon: Layout,
    endpoint: '/telxius/api/bulk/sites/',
    templateName: '01_site_template.json',
    sample: [
      { name: "Datacenter Lurin", width: 150.0, length: 200.0, measurementUnit: "METRIC", isLogical: false }
    ]
  },
  {
    id: 'catalog',
    title: 'Capa 2: Catálogo Lógico',
    description: 'Master Templates (Almacén Central)',
    icon: Inbox,
    endpoint: '/telxius/api/bulk/devices/?isCatalog=true',
    templateName: '02_catalog_template.json',
    sample: [{ name: "BDFB-TEMPLATE-V1", category: "BDFB", isTemplate: true }]
  }
  // },
  // {
  //   id: 'instances',
  //   title: 'Capa 3: Instanciación Física',
  //   description: 'Placement of Devices in Racks',
  //   icon: Box,
  //   endpoint: '/telxius/api/bulk/devices/',
  //   templateName: '03_instances_template.json',
  //   sample: [{ siteName: "Datacenter Lurin", containerName: "RACK-D12", templateName: "BDFB-TEMPLATE-V1", name: "BDFB-LURIN-01" }]
  // },
  // {
  //   id: 'equipment',
  //   title: 'Capa 4: Equipamiento Físico',
  //   description: 'Panels, Cards & Modules',
  //   icon: Cpu,
  //   endpoint: '/telxius/api/bulk/equipments/',
  //   templateName: '04_equipment_template.json',
  //   sample: [{ deviceName: "BDFB-LURIN-01", name: "Panel-A1", sn: "SN-998877", category: "SUBRACK", unitPosition: 40, unitHeight: 2 }]
  // },
  // {
  //   id: 'ports',
  //   title: 'Capa 5: Telemetría MQTT',
  //   description: 'Mapeo de Sensores InfluxDB',
  //   icon: Activity,
  //   endpoint: '/telxius/api/bulk/ports/',
  //   templateName: '05_ports_template.json',
  //   sample: [{ equipmentName: "Panel-A1", name: "Breaker-1", type: "POWER_OUT", sensorTopic: "0_1_1" }]
  // }
];

export default function CascadeIngestionPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Record<string, unknown[]>>({});
  const [status, setStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // Geography State
  const [geo, setGeo] = useState({
    country: 'Peru',
    region: 'Lima',
    province: 'Lima',
    town: 'Lima',
    district: 'Lurin'
  });

  const activeStep = STEPS[currentStep];

  const handleDownloadTemplate = () => {
    if (!activeStep) return;
    const blob = new Blob([JSON.stringify(activeStep.sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeStep.templateName;
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeStep) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setFiles(prev => ({ ...prev, [activeStep.id]: Array.isArray(json) ? json : [json] }));
      } catch (err) {
        console.error("Archivo inválido.", err);
        alert("Archivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  const executeUpload = async () => {
    if (!activeStep) return;
    const data = files[activeStep.id];
    if (!data) return;

    setLoading(true);
    try {
      const resp = await fetch(activeStep.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeStep.id === 'foundation' ? { ...geo, sites: data } : data)
      });

      const contentType = resp.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await resp.text();
        throw new Error(`Server returned non-JSON. Status: ${resp.status}`);
      }

      const result = await resp.json();

      if (resp.ok) {
        setStatus(prev => ({ ...prev, [activeStep.id]: 'success' }));
        if (currentStep === STEPS.length - 1) {
          fetchSummary();
        } else {
          setTimeout(() => setCurrentStep(prev => prev + 1), 1000);
        }
      } else {
        setStatus(prev => ({ ...prev, [activeStep.id]: 'error' }));
        alert(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, [activeStep.id]: 'error' }));
      alert(`Network Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const foundationData = files['foundation']?.[0] as { siteName?: string } | undefined;
      const siteName = foundationData?.siteName || geo.district;
      const resp = await fetch(`/telxius/api/topology/summary/?siteName=${encodeURIComponent(siteName)}`);
      const data = await resp.json();
      setSummaryData(data);
      setShowSummary(true);
    } catch (e) {
      console.error("Summary fetch failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-8 selection:bg-sky-500/30 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-white/5 pb-8">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-sky-500/20 rounded-2xl ring-1 ring-sky-500/30 shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)]">
              <Zap className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                Cascade <span className="text-sky-400 not-italic">Ingestion Wizard</span>
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Infrastructure as Code • Telxius Node Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`w-3 h-3 rounded-full transition-all duration-500 ${idx === currentStep ? 'bg-sky-400 scale-125 shadow-[0_0_10px_rgba(56,189,248,0.5)]' :
                  status[s.id] === 'success' ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
              />
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-4">

          {/* LEFT: STEP SELECTOR */}
          <div className="lg:col-span-4 space-y-4">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === currentStep;
              const isDone = status[s.id] === 'success';

              return (
                <button
                  key={s.id}
                  onClick={() => { if (!showSummary) setCurrentStep(idx) }}
                  className={`w-full p-5 rounded-3xl border transition-all text-left flex items-start gap-4 group relative overflow-hidden ${isActive ? 'bg-sky-500/10 border-sky-500/50 shadow-lg' :
                    isDone ? 'bg-emerald-500/5 border-emerald-500/20 opacity-70' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                    }`}
                >
                  <div className={`p-3 rounded-2xl transition-all ${isActive ? 'bg-sky-500 text-white' :
                    isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
                    }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {s.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tight">{s.description}</p>
                  </div>
                  {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto self-center" />}
                </button>
              );
            })}
          </div>

          {/* RIGHT: ACTION PANEL */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {showSummary ? (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/5 border border-emerald-500/20 rounded-[40px] p-10 backdrop-blur-3xl min-h-[500px] flex flex-col"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-emerald-400">Review Ingestion Results</h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Verify Hierarchical Consistency</p>
                    </div>
                  </div>

                  <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-8 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed">
                    <div className="text-white font-bold mb-4 flex items-center gap-2">
                      <Layout className="w-4 h-4 text-sky-400" /> SITE: {summaryData?.name}
                    </div>
                    {summaryData?.structures?.map((st: StructureData) => (
                      <div key={st.id} className="ml-4 border-l border-white/10 pl-6 py-2">
                        <div className="text-sky-400/80 font-bold">🏢 Structure: {st.name}</div>
                        {st.levels?.map((lv: LevelData) => (
                          <div key={lv.id} className="ml-4 border-l border-white/10 pl-6 py-1">
                            <div className="text-slate-400 italic">⌊ Level: {lv.name}</div>
                            {lv.rooms?.map((room: RoomData) => (
                              <div key={room.id} className="ml-4 border-l border-white/10 pl-6 py-2">
                                <div className="text-white bg-white/5 px-3 py-1 rounded inline-block">🚪 Room: {room.name}</div>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {room.racks?.map((cont: RackData) => (
                                    <div key={cont.id} className="bg-black/20 border border-white/10 p-4 rounded-2xl">
                                      <div className="text-sky-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                                        <Server className="w-3.5 h-3.5" /> {cont.name} ({cont.type})
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-end gap-4">
                    <button
                      onClick={() => setShowSummary(false)}
                      className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                      Back to Layer
                    </button>
                    <button
                      onClick={() => window.location.href = '/telxius/'}
                      className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center gap-3 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] active:scale-95"
                    >
                      Everything Correct • Finish <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeStep?.id || 'loading'}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-3xl min-h-[500px] flex flex-col justify-between"
                >
                  {!activeStep ? (
                    <div className="flex items-center justify-center flex-1 text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Finalizing Sequence...
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-8">
                          <span className="px-4 py-1.5 bg-sky-500/20 text-sky-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-sky-500/30">
                            Step {currentStep + 1} of {STEPS.length}
                          </span>
                          <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                          >
                            <Download className="w-4 h-4" /> Download Example Template
                          </button>
                        </div>

                        <h2 className="text-4xl font-light tracking-tight mb-2">Configure <span className="text-sky-400 font-bold italic">{activeStep.description}</span></h2>

                        {currentStep === 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 bg-white/5 p-6 rounded-3xl border border-white/10">
                            <div>
                              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Country</label>
                              <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" value={geo.country} onChange={(e) => setGeo({ ...geo, country: e.target.value })} />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Region</label>
                              <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" value={geo.region} onChange={(e) => setGeo({ ...geo, region: e.target.value })} />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Province</label>
                              <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" value={geo.province} onChange={(e) => setGeo({ ...geo, province: e.target.value })} />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Town</label>
                              <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" value={geo.town} onChange={(e) => setGeo({ ...geo, town: e.target.value })} />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">District</label>
                              <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" value={geo.district} onChange={(e) => setGeo({ ...geo, district: e.target.value })} />
                            </div>
                          </div>
                        )}

                        <p className="text-slate-400 max-w-xl mb-10 leading-relaxed text-sm">
                          Sigue la estructura en cascada para evitar la gestión manual de IDs. Sube el archivo JSON correspondiente a esta capa para continuar con la jerarquía de red.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                          {/* UPLOADER */}
                          <div className="relative group min-h-[220px]">
                            <div className={`absolute inset-0 border-2 border-dashed rounded-3xl transition-all duration-300 ${files[activeStep.id] ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 group-hover:border-sky-500/50 group-hover:bg-sky-500/5'
                              }`} />
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                              {files[activeStep.id] ? (
                                <>
                                  <FileJson className="w-12 h-12 text-emerald-400 mb-3" />
                                  <p className="text-emerald-400 font-bold uppercase text-xs">File Ready</p>
                                  <p className="text-slate-500 text-[10px] mt-1">{files[activeStep.id].length} records detected</p>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-12 h-12 text-slate-500 mb-3 group-hover:text-sky-500 transition-colors" />
                                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Suelta el JSON de {activeStep.id} aquí</p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* SAMPLE PREVIEW */}
                          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 font-mono text-[10px] leading-relaxed text-slate-500 overflow-auto max-h-[220px]">
                            <div className="flex items-center gap-2 text-slate-300 font-bold uppercase mb-3 text-[9px]">
                              <Box className="w-3 h-3 text-sky-500" /> Layer Preview
                            </div>
                            <pre className="text-sky-300/70">
                              {JSON.stringify(files[activeStep.id] || activeStep.sample, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-8">
                        <div className="flex items-center gap-4">
                          {status[activeStep.id] === 'success' && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase animate-bounce">
                              <CheckCircle2 className="w-4 h-4" /> Layer Persisted Successfully
                            </div>
                          )}
                          {status[activeStep.id] === 'error' && (
                            <div className="text-rose-500 text-xs font-bold uppercase flex items-center gap-2">
                              Error in Ingestion
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4">
                          {currentStep > 0 && (
                            <button
                              onClick={() => setCurrentStep(prev => prev - 1)}
                              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                            >
                              Back
                            </button>
                          )}
                          <button
                            disabled={(!files[activeStep.id] && status[activeStep.id] !== 'success') || loading}
                            onClick={() => {
                              if (status[activeStep.id] === 'success' && currentStep === STEPS.length - 1) {
                                fetchSummary();
                              } else {
                                executeUpload();
                              }
                            }}
                            className="px-10 py-5 bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:grayscale text-neutral-950 font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center gap-3 shadow-[0_0_40px_-10px_rgba(14,165,233,0.5)] active:scale-95"
                          >
                            {loading ? 'Processing Node Grid...' : (
                              status[activeStep.id] === 'success' && currentStep === STEPS.length - 1 ?
                                <>Review Full Tree <ArrowRight className="w-4 h-4" /></> :
                                <>Next Layer <ChevronRight className="w-4 h-4" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
