// server/neo4j.js
import 'dotenv/config';          // <-- ensures .env is loaded
import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

// Optional: clear error messages if anything is missing
function assertEnv(name, value) {
  if (!value) {
    throw new Error(`[Neo4j] Missing ${name}. Check server/.env and that dotenv is loaded.`);
  }
}
assertEnv('NEO4J_URI', uri);
assertEnv('NEO4J_USER', user);
assertEnv('NEO4J_PASSWORD', password);

// Use native JS numbers from the driver
export const driver = neo4j.driver(
  uri,
  neo4j.auth.basic(user, password),
  { disableLosslessIntegers: true }
);

export async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function closeDriver() {
  await driver.close();
}
