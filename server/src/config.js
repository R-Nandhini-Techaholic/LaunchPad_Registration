import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const DB_PATH = path.join(DATA_DIR, "launch-pad-2026.db");
export const PORT = Number(process.env.PORT) || 4000;
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const DATABASE_PROVIDER = DATABASE_URL ? "postgres" : "sqlite";
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
