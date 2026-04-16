import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { verifyJwt } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  
  const payload: any = await verifyJwt(token);
  if (!payload || payload.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, createdAt: true, mustChangePassword: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  
  const payload: any = await verifyJwt(token);
  if (!payload || payload.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const { username, password, name, role } = await req.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hash,
        name,
        role: role || "TECHNICIAN",
        mustChangePassword: true
      },
      select: { id: true, username: true, name: true, role: true }
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear el usuario" }, { status: 500 });
  }
}
