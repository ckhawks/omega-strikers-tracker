"use server";

import crypto from "crypto";
import { db } from "@/util/db/db";
import { isAuthed } from "@/util/auth";
import { revalidatePath } from "next/cache";

export async function createToken(label: string) {
  if (!isAuthed()) return { error: "unauthorized" as const };
  const clean = (label || "").trim();
  if (!clean) return { error: "label required" as const };
  const token = "os_" + crypto.randomBytes(24).toString("hex");
  await db(`INSERT INTO "IngestToken" (token, label) VALUES ($1, $2)`, [token, clean]);
  revalidatePath("/admin/tokens");
  return { error: null, token };
}

export async function revokeToken(id: string) {
  if (!isAuthed()) return { error: "unauthorized" as const };
  await db(`UPDATE "IngestToken" SET active = false WHERE id = $1`, [id]);
  revalidatePath("/admin/tokens");
  return { error: null };
}

export async function reactivateToken(id: string) {
  if (!isAuthed()) return { error: "unauthorized" as const };
  await db(`UPDATE "IngestToken" SET active = true WHERE id = $1`, [id]);
  revalidatePath("/admin/tokens");
  return { error: null };
}
