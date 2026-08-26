"use server";
import { cookies } from "next/headers";

export async function setAuthToken(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
