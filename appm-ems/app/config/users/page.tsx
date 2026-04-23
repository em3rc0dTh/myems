"use client";
import React, { useEffect, useState } from "react";
import { Users, UserPlus, ShieldAlert, KeyRound, Save, Loader2, RefreshCw } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "TECHNICIAN"
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/appm-ems/api/users/");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    MySwal.fire({
      title: "Creando usuario...",
      allowOutsideClick: false,
      didOpen: () => { MySwal.showLoading(); }
    });

    try {
      const res = await fetch("/appm-ems/api/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      setForm({ username: "", password: "", name: "", role: "TECHNICIAN" });
      await fetchUsers();

      MySwal.fire({
        icon: "success",
        title: "Usuario creado",
        text: "El usuario deberá cambiar su contraseña en el primer inicio de sesión.",
        background: "#1E293B",
        color: "#fff"
      });
    } catch (e: any) {
      MySwal.fire({
        icon: "error",
        title: "Error",
        text: e.message,
        background: "#1E293B",
        color: "#fff"
      });
    }
  };

  return (
    <div className="p-8 pb-32">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-white font-mono tracking-wider flex items-center gap-3">
            <Users className="text-sky-500" /> Dashboard de Accesos
          </h1>
          <p className="text-slate-400 font-mono mt-1 uppercase tracking-widest text-xs">Administración de Usuarios y Permisos</p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchUsers} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 text-sky-400 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-sky-500/20">
            <UserPlus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-800">
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Completo</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Username</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</th>
              <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="p-5">
                  <div className="flex items-center gap-2">
                    {u.mustChangePassword ? (
                      <span className="flex bg-rose-500/10 text-rose-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider items-center gap-1 border border-rose-500/20">
                        <KeyRound className="w-3 h-3" /> PENDIENTE PWD
                      </span>
                    ) : (
                      <span className="flex bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider items-center gap-1 border border-emerald-500/20">
                        <ShieldAlert className="w-3 h-3" /> ACTIVO
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-5 text-sm font-medium text-white">{u.name}</td>
                <td className="p-5 text-sm text-slate-400 font-mono">{u.username}</td>
                <td className="p-5">
                  {u.role === "ADMIN" ? (
                      <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Administrador</span>
                  ) : (
                      <span className="text-sky-500 text-[10px] font-black uppercase tracking-widest bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">Técnico</span>
                  )}
                </td>
                <td className="p-5">
                  <button className="text-slate-500 hover:text-white transition-colors text-xs font-mono">-</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-sm">No hay usuarios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative">
            <h2 className="text-2xl font-black text-white font-mono tracking-wider mb-6 flex gap-2">
               <UserPlus className="text-sky-500" /> Crear Cuenta
            </h2>
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-600 transition-all" placeholder="Ej: Juan Pérez" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Username</label>
                  <input required type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono placeholder:text-slate-600 transition-all" placeholder="jperez" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contraseña Temporal</label>
                  <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono placeholder:text-slate-600 transition-all" placeholder="••••••" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rol Asignado</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 appearance-none font-mono text-sm transition-all">
                  <option value="TECHNICIAN">TÉCNICO (Solo lectura)</option>
                  <option value="ADMIN">ADMINISTRADOR (Control total)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 rounded-xl uppercase tracking-widest transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 flex gap-2 items-center justify-center px-4 py-3 text-sm font-black text-black bg-sky-500 hover:bg-sky-400 rounded-xl uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)]">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
