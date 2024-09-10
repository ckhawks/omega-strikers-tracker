// app/api/logout/route.js
import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.json({ message: "Logged out" });

  // Clear both the 'auth-token' and 'client-auth' cookies
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    maxAge: 0, // Expire the cookie immediately
  });
  response.cookies.set("client-auth", "", {
    httpOnly: false,
    maxAge: 0, // Expire the cookie immediately
  });

  return response;
}
