import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Forzar el borrado de la cookie usando los mismos parámetros que el login
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: "/telxius",
  });

  return response;
}
