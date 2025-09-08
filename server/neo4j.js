// server/neo4j.js
import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} in server/.env`);
  return v;
}

const uri = requireEnv("NEO4J_URI");
const user = requireEnv("NEO4J_USER");
const password = requireEnv("NEO4J_PASSWORD");

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

/** Recursively convert Neo4j Integers and nested structures to plain JS */
function toNative(value) {
  if (!value) return value;

  // Neo4j Integer objects have a toNumber() function
  if (typeof value.toNumber === "function") return value.toNumber();

  // Arrays
  if (Array.isArray(value)) return value.map(toNative);

  // Plain objects
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toNative(v);
    return out;
  }
  return value;
}

export async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const res = await session.run(cypher, params);
    return res.records.map(r => toNative(r.toObject()));
  } finally {
    await session.close();
  }
}
