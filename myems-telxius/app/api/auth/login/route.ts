import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/auth";

const prisma = new PrismaClient();

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
    console.log("[AUTH-DEBUG] Environment Mode:", isProdMode ? 'PROD' : 'DEV');

    const token = await signJwt(payload);
    console.log("[AUTH-DEBUG] Token generated successfully for:", username);

    const response = NextResponse.json({
      success: true,
      user: payload,
    });

    // Set cookie HTTP Only
    // IMPORTANTE: secure debe ser false si accedemos por IP/HTTP, incluso en PROD
    const isHttps = req.nextUrl.protocol === 'https:';

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isHttps && isProdMode, 
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    console.log(`[AUTH-DEBUG] Login successful. Cookie Secure: ${isHttps && isProdMode}`);
    return response;
  } catch (error: any) {
    console.error("CRITICAL LOGIN ERROR:", error.message, error.stack);
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error.message 
    }, { status: 500 });
  }
}
