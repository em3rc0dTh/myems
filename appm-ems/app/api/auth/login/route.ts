import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario o contraseña inválidos" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: "Usuario o contraseña inválidos" }, { status: 401 });
    }

    // JWT payload
    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const isProdMode = process.env.NEXT_PUBLIC_APP_MODE === 'prod';
    const token = await signJwt(payload);

    const response = NextResponse.json({
      success: true,
      user: payload,
    });

    // Set cookie HTTP Only
    const isHttps = req.nextUrl.protocol === 'https:';

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isHttps && isProdMode, 
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/appm-ems", 
    });

    return response;
  } catch (error: any) {
    console.error("CRITICAL LOGIN ERROR:", error.message);
    return NextResponse.json({ 
      error: "Error interno del servidor",
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}
