import fs from "node:fs";
import archiver from "archiver";
fs.mkdirSync("public", { recursive: true });
const output = fs.createWriteStream("public/northstar-starter.zip");
const archive = archiver("zip", { zlib: { level: 9 } });
archive.on("error", (e) => {
  throw e;
});
archive.pipe(output);
archive.glob(
  "**/*",
  {
    cwd: "starter",
    dot: true,
    ignore: ["node_modules/**", ".env*", "package-lock.json"],
  },
  { prefix: "northstar-resolution-pilot" },
);
await archive.finalize();
await new Promise((resolve) => output.on("close", resolve));
console.log("Packaged public/northstar-starter.zip");
