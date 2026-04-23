import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "A_VERY_SECURE_SECRET_TOKEN_FOR_APPM_EMS_DEV";
const encodedKey = new TextEncoder().encode(secretKey);

export async function signJwt(payload: { id: string; username: string; name: string; role: string; mustChangePassword: boolean }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}
