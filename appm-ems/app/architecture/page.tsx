import React from 'react';
import DeviceSchematicMock from '@/components/DeviceSchematicMock';

export default function ArchitecturePage() {
  const isProd = process.env.NEXT_PUBLIC_APP_MODE === 'prod';

  if (isProd) {
    return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4 italic">Visualización Arquitectónica</h2>
            <p className="text-slate-500 max-w-md font-medium">Esta vista está optimizada para la topología de Datacenter Lurin. Por favor, asegúrese de haber completado la ingesta de infraestructura para habilitar los esquemáticos lógicos en este nodo.</p>
        </div>
    );
  }

  return <DeviceSchematicMock />;
}
