// /app/api/admin/migrate/route.ts
// TEMPORARY, one-time-use route to apply db/migrations/0001_init.sql
// against the real Vercel Postgres database. Exists only because the
// Postgres connection string is a Vercel "Sensitive" env var that
// `vercel env pull` masks and the CLI can't extract for local use — this
// route runs inside the actual deployment, which legitimately can read
// its own env vars. Deleted immediately after confirmed success; this is
// not meant to be a standing admin endpoint.

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const action = new URL(request.url).searchParams.get("action") ?? "check";

  if (action === "check") {
    const result = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    return NextResponse.json({ existingTables: result.rows.map((r) => r.table_name) });
  }

  if (action === "up" || action === "down") {
    const file = action === "up" ? "0001_init.sql" : "0001_init.down.sql";
    const filePath = path.join(process.cwd(), "db", "migrations", file);
    const migrationSql = fs.readFileSync(filePath, "utf8");

    // node-postgres/@vercel/postgres's tagged-template sql() doesn't run
    // multi-statement scripts directly — dropping to the underlying pool
    // for this one-time DDL script specifically.
    const { db } = await import("@vercel/postgres");
    await db.query(migrationSql);

    const result = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    return NextResponse.json({ applied: file, tables: result.rows.map((r) => r.table_name) });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
