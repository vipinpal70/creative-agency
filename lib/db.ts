import mongoose from "mongoose";

let cached = (global as any).mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexSynced?: boolean;
};

if (!cached) {
  (global as any).mongoose = { conn: null, promise: null, indexSynced: false };
  cached = (global as any).mongoose;
}

// Drop the obsolete unique-per-(client,scope,module) index if it still exists.
// Multiple non-completed calendars for the same module are now allowed. Runs at most
// once per process; the flag lives on the global cache so it survives dev hot-reloads.
// Best-effort: a missing index or a fresh DB is a harmless no-op.
async function ensureCalendarIndexes(conn: typeof mongoose) {
  if (cached.indexSynced) return;
  cached.indexSynced = true;
  try {
    await conn.connection
      .collection("calendars")
      .dropIndex("unique_active_calendar_per_scope_module");
  } catch {
    /* index absent or already dropped — ignore */
  }
}

export async function connectDB() {
  if (cached.conn) {
    await ensureCalendarIndexes(cached.conn);
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  await ensureCalendarIndexes(cached.conn);
  return cached.conn;
}
