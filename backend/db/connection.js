import { MongoClient } from "mongodb";

// Atlas URI or host env var
const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
let db;

// establish connection
export async function connect() {
  await client.connect();
  db = client.db(process.env.DB_NAME || "pantry_planner");
  return db;
}

// retrieve db without reconnecting
export function getDb() {
  if (!db) throw new Error("Database not connected. Call connect() first.");
  return db;
}

// close connection
export const close = () => client.close();
