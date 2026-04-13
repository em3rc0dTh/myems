"use client"
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Map,
  Settings,
  Activity,
  Database,
  Layers,
  Zap,
  LayoutDashboard,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Dashboard BDFB',
    icon: LayoutDashboard,
    href: '/',
    description: 'Monitoreo en Tiempo Real'
  },
  {
    label: 'Mapa de Nodos',
    icon: Map,
    href: '/topology/dashboard/',
    description: 'Sites, Edificios y Salas'
  },
  {
    label: 'Gestión de Activos',
    icon: Database,
    href: '/topology/',
    description: 'Ingeniería y Carga de Red'
  }
];

export default function NavigationSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <>
      <aside
        className={`fixed left-6 top-1/2 -translate-y-1/2 z-[100] hidden lg:flex flex-col gap-4 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-32 opacity-0 pointer-events-none'}`}
      >
        <div className="bg-black/40 backdrop-blur-3xl border border-white/5 p-2.5 rounded-[32px] flex flex-col gap-2 shadow-2xl ring-1 ring-white/5">

          {/* Brand Logo / Home Mini */}
          <div className="p-3 mb-2 flex items-center justify-center">
            <div className="w-8 h-8 bg-sky-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
          </div>

          {NAV_ITEMS.map((item) => {
            let isActive = false;
            if (item.href === '/') {
              isActive = pathname === '/';
            } else if (item.href === '/topology/dashboard/') {
              isActive = pathname?.startsWith('/topology/dashboard/');
            } else if (item.href === '/topology/') {
              isActive = pathname?.startsWith('/topology/') && !pathname?.startsWith('/topology/dashboard/');
            }

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center justify-center p-4 rounded-2xl transition-all duration-500 ${isActive
                  ? 'bg-sky-500 text-black shadow-lg shadow-sky-500/20'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-500 group-hover:scale-110`} />

                <div className="absolute left-full ml-6 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-4 group-hover:translate-x-0 whitespace-nowrap z-[110]">
                  <div className="bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl relative">
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-white/10 rotate-45" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">{item.label}</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">{item.description}</p>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_#0ea5e9]" />
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setIsOpen(false)}
            className="p-4 mt-2 rounded-2xl text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all group relative border-t border-white/5"
            title="Ocultar Navegación"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>

        <div className="bg-emerald-500/10 backdrop-blur-3xl border border-emerald-500/20 p-4 rounded-[80px] flex items-center justify-center group cursor-pointer hover:bg-emerald-500/20 transition-all border-dashed">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
          <div className="absolute left-full ml-6 opacity-0 group-hover:opacity-100 pointer-events-none transition-all">
            <span className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Status: Online</span>
          </div>
        </div>
      </aside>

      {/* Global Explorer Trigger (Icono Abajo) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-10 left-10 z-[100] p-4 bg-slate-900 hover:bg-slate-800 text-sky-500 rounded-full shadow-2xl border border-white/10 transition-all animate-in slide-in-from-left-10 duration-500 flex items-center gap-3 group"
          title="Abrir Navegación"
        >
          <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <div className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
        </button>
      )}
    </>
  );
}
