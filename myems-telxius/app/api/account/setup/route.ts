import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { verifyJwt, signJwt } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payload: any = await verifyJwt(token);
  if (!payload) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { newPassword, newUsername } = await req.json();

  if (!newPassword || newPassword.length < 5) {
     return NextResponse.json({ error: "La contraseña debe tener al menos 5 caracteres" }, { status: 400 });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    
    const updatedUser = await prisma.user.update({
      where: { id: payload.id as string },
      data: {
        password: hash,
        username: newUsername || payload.username,
        mustChangePassword: false
      }
    });

    const newPayload = {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: updatedUser.mustChangePassword,
    };

    const newToken = await signJwt(newPayload);

    const response = NextResponse.json({ success: true, user: newPayload });
    response.cookies.set("auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch(e) {
    console.error("Setup route error", e);
    return NextResponse.json({ error: "Error cambiando contraseña. Quizá el usuario ya existe." }, { status: 500 });
  }
}
