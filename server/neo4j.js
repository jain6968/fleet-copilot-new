// server/neo4j.js
import "dotenv/config"; // safe even if index.js already loaded it
import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !user || !password) {
  console.error("[neo4j] Missing env vars NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD");
}

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  // optional tuning
  // encrypted: "ENCRYPTION_ON"
});

export async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const res = await session.run(cypher, params);
    return res; // always return the result object
  } catch (err) {
    console.error("[neo4j] query error:", err);
    throw err; // let the route error handler respond with 500 JSON
  } finally {
    await session.close();
  }
}
