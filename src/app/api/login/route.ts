// app/api/login/route.js
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  // Replace with your actual password
  const secretPassword = process.env.SECRET_PASSWORD;

  if (password === secretPassword) {
    // Generate a simple token (for demo purposes)
    const token = Buffer.from(password).toString("base64");

    // Set an HTTP-only cookie to store the token
    const response = NextResponse.json({ message: "Logged in" });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 1 day
    });

    // Set a non-HTTP-only token for client-side checks
    response.cookies.set("client-auth", "true", {
      httpOnly: false,
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  }

  return NextResponse.json({ message: "Invalid password" }, { status: 401 });
}
