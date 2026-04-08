"use client"
import React from 'react';
import { PanelData } from '@/lib/types';

interface BDFBFrontViewProps {
  panels: PanelData[];
  selectedPanelId: string | null;
  onPanelClick: (panelId: string) => void;
}

const BDFBFrontView: React.FC<BDFBFrontViewProps> = ({ 
  panels, 
  selectedPanelId, 
  onPanelClick, 
}) => {
  
  const getPanel = (name: string) => panels.find(p => p.name === name);

  return (
    <div className="flex flex-col h-full items-center justify-center relative py-12 px-4 select-none">
      
      {/* Background Glow */}
      <div className="absolute inset-0 bg-fuchsia-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* THE MANDATORY CHASSIS (U-FRAME) */}
      <div className="relative w-full max-w-[180px] flex flex-col items-center">
        
        {/* Main U-Frame */}
        <div className="w-full aspect-[3/4] border-t-2 border-x-2 border-fuchsia-500/80 rounded-t-2xl relative bg-slate-950/40 backdrop-blur-sm shadow-[0_0_30px_rgba(232,121,249,0.1)] group">
            
            {/* Top Detail (Optional internal bezel) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-fuchsia-500/40 rounded-b-full shadow-[0_0_10px_#f0abfc]" />

            {/* Internal Panel Grid (2x2) */}
            <div className="absolute inset-x-4 inset-y-6 grid grid-cols-2 grid-rows-2 gap-4">
                <PanelButton 
                    panel={getPanel("A2")} 
                    isSelected={selectedPanelId === getPanel("A2")?.id}
                    onPanelClick={onPanelClick}
                />
                <PanelButton 
                    panel={getPanel("B2")} 
                    isSelected={selectedPanelId === getPanel("B2")?.id}
                    onPanelClick={onPanelClick}
                />
                <PanelButton 
                    panel={getPanel("A1")} 
                    isSelected={selectedPanelId === getPanel("A1")?.id}
                    onPanelClick={onPanelClick}
                />
                <PanelButton 
                    panel={getPanel("B1")} 
                    isSelected={selectedPanelId === getPanel("B1")?.id}
                    onPanelClick={onPanelClick}
                />
            </div>
        </div>

        {/* The Base Wings (Ground Lines) */}
        <div className="w-[140%] h-[2px] bg-fuchsia-500/60 shadow-[0_0_15px_#f0abfc] relative">
            <div className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_#f0abfc] animate-pulse" />
            <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_#f0abfc] animate-pulse" />
        </div>
      </div>

      {/* Descriptive Footer */}
      <div className="mt-12 text-center">
         <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-[0.2em] italic">Chassis Selector</span>
         <p className="text-[8px] text-slate-500 font-mono uppercase mt-1">Status: Operational • All Feeds Live</p>
      </div>
    </div>
  );
};

interface PanelButtonProps {
  panel: PanelData | undefined;
  isSelected: boolean;
  onPanelClick: (id: string) => void;
}

const PanelButton: React.FC<PanelButtonProps> = ({ panel, isSelected, onPanelClick }) => {
  if (!panel) return <div className="bg-white/5 rounded-xl animate-pulse" />;

  return (
    <div 
      className={`
        relative rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden group
        ${isSelected 
          ? 'bg-accent-primary/20 border-accent-primary shadow-[0_0_15px_rgba(14,165,233,0.3)] scale-105 z-10' 
          : 'bg-slate-900 border-white/10 hover:border-fuchsia-500/50 hover:bg-white/[0.03]'}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onPanelClick(panel.id);
      }}
    >
      <span className={`text-sm font-black tracking-tighter transition-all ${isSelected ? 'text-white' : 'text-slate-600 group-hover:text-fuchsia-400'}`}>
        {panel.name}
      </span>
      
      {/* Indicator */}
      <div className={`absolute bottom-1 w-2 h-0.5 rounded-full ${isSelected ? 'bg-accent-primary shadow-[0_0_8px_#38bdf8]' : 'bg-transparent'}`} />
      
      {isSelected && (
        <div className="absolute top-0 right-0 p-1 opacity-50">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default BDFBFrontView;
