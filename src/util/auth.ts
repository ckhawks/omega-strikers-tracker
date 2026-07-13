import { cookies } from "next/headers";

// Server-side auth check matching the existing login flow: the httpOnly
// `auth-token` cookie holds base64(SECRET_PASSWORD).
export function isAuthed(): boolean {
  const secret = process.env.SECRET_PASSWORD;
  if (!secret) return false;
  const token = cookies().get("auth-token")?.value;
  if (!token) return false;
  return token === Buffer.from(secret).toString("base64");
}
