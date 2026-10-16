import { getDb } from "../src/server/db";
import { schema } from "../src/server/schema";
await (await getDb()).query(schema);
console.log("Demo database schema is ready.");
process.exit(0);
