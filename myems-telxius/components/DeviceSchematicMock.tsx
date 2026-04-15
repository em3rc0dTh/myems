"use client"
import React from 'react';
import { MOCK_INFRASTRUCTURE_DATA } from '@/lib/mockData';

const DeviceSchematicMock = () => {
    // Navigating the massive mock structure precisely to the devices.
    const devicesList = MOCK_INFRASTRUCTURE_DATA.infrastructure[0] // Country
        .regions[0].provinces[0].towns[0].districts[0].sites[0]
        .structures[0].levels[0].substructures[0].rows[0].positions;

    const bdfbPosition = devicesList.find(p => p.id === 'pos-b12')!;
    const routerPosition = devicesList.find(p => p.id === 'pos-a04')!;

    const plantaDevice = bdfbPosition.containers[0].containerSpaces[0].devices.find(d => d.id === 'dev-planta-rect')!;
    const bdfbDevice = bdfbPosition.containers[0].containerSpaces[0].devices.find(d => d.id === 'dev-bdfb-dist')!;
    const routerDevice = routerPosition.containers[0].containerSpaces[0].devices.find(d => d.id === 'dev-client-router')!;

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-950 p-6 text-white select-none flex flex-col">
            {/* Header */}
            <div className="mb-4 border-b border-white/10 w-full pb-4 flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-widest bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                        Físico a Lógico
                    </h1>
                </div>
                <div className="flex gap-4 mb-2">
                    <Legend badge="DEVICE" color="#22c55e" label="Contenedor Lógico" />
                    <Legend badge="EQUIPMENT" color="#3b82f6" label="Apilamiento Físico" />
                    <Legend badge="PORT" color="#1e293b" borderColor="#f59e0b" label="Punto de Conexión (Bornera)" />
                    <Legend badge="CONNECTION" color="#d946ef" label="Línea Analítica" />
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full min-h-0 bg-black/60 border border-white/10 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-2xl">

                {/* Background Grid Pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="gridx" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridx)" />
                </svg>

                <svg viewBox="0 0 1750 900" className="w-full h-full drop-shadow-2xl z-10 font-sans" preserveAspectRatio="xMidYMid meet">

                    {/* ====== DEVICE 1: POWER SOURCE ====== */}
                    <g transform="translate(50, 100)">
                        <DeviceBox width={420} height={600} title={`1. ${plantaDevice.name}`} location="SITE: TX / SALA: 01" />

                        {/* Equipment Chassis */}
                        <g transform="translate(30, 80)">
                            <EquipmentBox width={360} height={490} title={plantaDevice.equipments[0].name} />

                            {/* Equipment: Battery Bank */}
                            <g transform="translate(30, 60)">
                                <EquipmentBox width={300} height={150} title={plantaDevice.equipments[0].children![0].name} fillOpacity="0.1" />

                                <g transform="translate(260, 45)">
                                    <PortBornera port={plantaDevice.equipments[0].children![0].ports![0]} />
                                </g>
                                <g transform="translate(260, 100)">
                                    <PortBornera port={plantaDevice.equipments[0].children![0].ports![1]} />
                                </g>
                            </g>

                            {/* Equipment: Rectificador */}
                            <g transform="translate(30, 240)">
                                <EquipmentBox width={300} height={220} title={plantaDevice.equipments[0].children![1].name} fillOpacity="0.1" />

                                <g transform="translate(260, 60)">
                                    <PortBornera port={plantaDevice.equipments[0].children![1].ports![0]} />
                                </g>
                                <g transform="translate(260, 150)">
                                    <PortBornera port={plantaDevice.equipments[0].children![1].ports![1]} />
                                </g>
                            </g>
                        </g>
                    </g>


                    {/* ====== CONNECTIONS (Planta -> BDFB) ====== */}
                    {/* Battery (+) Y=285 -> BDFB Input (+) Y=480 */}
                    <path d="M 390 285 C 480 285, 480 480, 595 480" fill="none" stroke="#d946ef" strokeWidth="6" strokeDasharray="8 8" className="animate-pulse" />
                    {/* Rectifier (+) Y=480 -> BDFB Input (+) Y=480 */}
                    <path d="M 390 480 L 595 480" fill="none" stroke="#d946ef" strokeWidth="6" strokeDasharray="8 8" className="animate-pulse" />

                    {/* Battery (-) Y=340 -> BDFB Input (-) Y=540 */}
                    <path d="M 390 340 C 450 340, 500 540, 595 540" fill="none" stroke="#38bdf8" strokeWidth="6" strokeDasharray="8 8" className="animate-pulse" />
                    {/* Rectifier (-) Y=570 -> BDFB Input (-) Y=540 */}
                    <path d="M 390 570 C 450 570, 500 540, 595 540" fill="none" stroke="#38bdf8" strokeWidth="6" strokeDasharray="8 8" className="animate-pulse" />


                    {/* ====== DEVICE 2: BDFB ====== */}
                    <g transform="translate(560, 50)">
                        <DeviceBox width={580} height={800} title={`2. ${bdfbDevice.name}`} location={`POS: ${bdfbPosition.name}`} />

                        {/* Main Chassis Equipment */}
                        <g transform="translate(30, 80)">
                            <EquipmentBox width={520} height={690} title={bdfbDevice.equipments[0].name} />

                            {/* Equipment: INPUT & SHUNT */}
                            <g transform="translate(30, 260)">
                                <EquipmentBox width={140} height={250} title={bdfbDevice.equipments[0].children![0].name} fillOpacity="0.1" />

                                <g transform="translate(0, 90)">
                                    <PortBornera port={bdfbDevice.equipments[0].children![0].ports![0]} isLeft={true} />
                                </g>
                                <g transform="translate(0, 150)">
                                    <PortBornera port={bdfbDevice.equipments[0].children![0].ports![1]} isLeft={true} />
                                </g>

                                {/* Shunt abstraction as internal visual */}
                                <g transform="translate(80, 80)">
                                    <rect width="40" height="20" rx="4" fill="#0f172a" stroke="#cbd5e1" />
                                    <text x="20" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">Shunt A</text>
                                </g>
                                <g transform="translate(80, 140)">
                                    <rect width="40" height="20" rx="4" fill="#0f172a" stroke="#cbd5e1" />
                                    <text x="20" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">Shunt B</text>
                                </g>

                                {/* Internal Connection Simulation */}
                                <path d="M 50 90 L 80 90 M 120 90 L 200 90" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                                <path d="M 50 150 L 80 150 M 120 150 L 200 150" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                            </g>

                            {/* Equipment: Panel A1 */}
                            <g transform="translate(220, 60)">
                                <EquipmentBox width={260} height={270} title={bdfbDevice.equipments[0].children![1].name} fillOpacity="0.1" />
                                <text x="130" y="50" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">Apilamiento de Equipos</text>

                                {/* Ports */}
                                {bdfbDevice.equipments[0].children![1].ports!.map((port, i) => (
                                    <g transform={`translate(220, ${100 + i * 60})`} key={port.id}>
                                        <PortBornera port={port} />
                                    </g>
                                ))}
                            </g>

                            {/* Equipment: Panel B1 */}
                            <g transform="translate(220, 360)">
                                <EquipmentBox width={260} height={270} title={bdfbDevice.equipments[0].children![2].name} fillOpacity="0.1" />
                                <text x="130" y="50" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">Apilamiento de Equipos</text>

                                {/* Ports */}
                                {bdfbDevice.equipments[0].children![2].ports!.map((port, i) => (
                                    <g transform={`translate(220, ${100 + i * 60})`} key={port.id}>
                                        <PortBornera port={port} />
                                    </g>
                                ))}
                            </g>
                        </g>
                    </g>

                    {/* ====== CONNECTIONS (BDFB -> Client) ====== */}
                    <path d="M 1050 590 C 1200 590, 1200 450, 1365 450" fill="none" stroke="#38bdf8" strokeWidth="6" strokeDasharray="8 8" className="animate-pulse" />

                    {/* Concept Label over Connection */}
                    <g transform="translate(1160, 505)">
                        <rect x="0" y="0" width="100" height="30" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                        <text x="50" y="19" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontWeight="900" className="tracking-widest">CONNECTION</text>
                    </g>

                    {/* ====== DEVICE 3: CLIENT ROUTER ====== */}
                    <g transform="translate(1330, 200)">
                        <DeviceBox width={380} height={450} title={`3. ${routerDevice.name}`} location={`POS: ${routerPosition.name}`} />

                        {/* Equipment Changer */}
                        <g transform="translate(30, 80)">
                            <EquipmentBox width={320} height={340} title={routerDevice.equipments[0].name} />

                            <g transform="translate(30, 60)">
                                <EquipmentBox width={260} height={240} title={routerDevice.equipments[0].children![0].name} fillOpacity="0.1" />

                                <g transform="translate(0, 110)">
                                    <PortBornera port={routerDevice.equipments[0].children![0].ports![0]} isLeft={true} />
                                </g>

                                <g transform="translate(220, 110)">
                                    <PortBornera port={routerDevice.equipments[0].children![0].ports![1]} />
                                </g>
                            </g>
                        </g>
                    </g>
                </svg>
            </div>

        </div>
    );
};

// Reusable UI Components for the specific TAPI Modeling
interface LegendProps {
    badge: string;
    color: string;
    borderColor?: string;
    label: string;
}

const Legend = ({ badge, color, borderColor = color, label }: LegendProps) => (
    <div className="flex items-center gap-3 bg-white/5 pr-4 pl-1 py-1 rounded-full border border-white/10">
        <span className="px-3 py-1 text-[10px] uppercase font-black rounded-full border border-opacity-50" style={{ backgroundColor: `${color}33`, color: color === '#1e293b' ? '#f59e0b' : color, borderColor }}>{badge}</span>
        <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
);

interface DeviceBoxProps {
    width: number;
    height: number;
    title: string;
    location: string;
}

const DeviceBox = ({ width, height, title, location }: DeviceBoxProps) => (
    <>
        <rect x="0" y="0" width={width} height={height} rx="24" fill="rgba(34, 197, 94, 0.03)" stroke="#22c55e" strokeWidth="3" strokeDasharray="12 12" />
        <rect x="30" y="-15" width="100" height="30" rx="15" fill="#22c55e" />
        <text x="80" y="4" textAnchor="middle" fill="#064e3b" fontSize="12" fontWeight="900" className="tracking-widest">DEVICE</text>
        <text x="30" y="35" fill="#4ade80" fontSize="22" fontWeight="900" className="tracking-widest uppercase drop-shadow-md">{title}</text>
        <text x="30" y="55" fill="#22c55e" fillOpacity="0.7" fontSize="12" fontWeight="bold" className="tracking-widest uppercase">{location}</text>
    </>
);

interface EquipmentBoxProps {
    width: number;
    height: number;
    title: string;
    fillOpacity?: string;
}

const EquipmentBox = ({ width, height, title, fillOpacity = "0.05" }: EquipmentBoxProps) => (
    <>
        <rect x="0" y="0" width={width} height={height} rx="16" fill={`rgba(59, 130, 246, ${fillOpacity})`} stroke="#3b82f6" strokeWidth="2" />
        <rect x="20" y="-12" width="100" height="24" rx="12" fill="#3b82f6" />
        <text x="70" y="3" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900" className="tracking-widest">EQUIPMENT</text>
        <text x="20" y="30" fill="#93c5fd" fontSize="16" fontWeight="bold" className="drop-shadow-md">{title}</text>
    </>
);

const PortBornera = ({ port, isLeft = false, isBlue = false }: { port: any, isLeft?: boolean, isBlue?: boolean }) => {
    // Estilos de los "Holders" (borneras negras) de las que hablaba el cliente
    const accentColor = isBlue ? '#38bdf8' : (port.isPositive ? '#d946ef' : '#f59e0b');

    return (
        <g className="cursor-crosshair hover:opacity-80 transition-opacity">
            {/* The Black Box Holder */}
            <rect x={isLeft ? "-20" : "0"} y="-20" width="40" height="40" rx="6" fill="#0f172a" stroke={accentColor} strokeWidth="3" className="shadow-2xl" />
            <circle cx={isLeft ? "0" : "20"} cy="0" r="6" fill={accentColor} />

            {/* Port Label */}
            <text x={isLeft ? "30" : "-10"} y="5" textAnchor={isLeft ? "start" : "end"} fill={accentColor} fontSize="14" fontWeight="900">{port.name}</text>

            {/* Category Tag */}
            <text x={isLeft ? "-45" : "35"} y="-8" textAnchor={isLeft ? "end" : "start"} fill="#64748b" fontSize="9" fontWeight="900" className="tracking-widest uppercase">PORT</text>
            <text x={isLeft ? "-45" : "35"} y="6" textAnchor={isLeft ? "end" : "start"} fill="#cbd5e1" fontSize="9" className="uppercase font-bold">Cat: {port.category}</text>
        </g>
    );
};

export default DeviceSchematicMock;
