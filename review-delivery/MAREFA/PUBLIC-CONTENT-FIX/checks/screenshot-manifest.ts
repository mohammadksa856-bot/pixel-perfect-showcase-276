import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
function dimensions(bytes: Buffer) {
  if (bytes.subarray(1, 4).toString() === "PNG")
    return { format: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1]!;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return {
          format: "jpeg",
          width: bytes.readUInt16BE(offset + 7),
          height: bytes.readUInt16BE(offset + 5),
        };
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
  }
  throw new Error("Unrecognized screenshot format");
}
// Screenshots stay outside Git. Record filenames, dimensions and integrity only.
const directory =
  process.argv[2] ??
  fileURLToPath(
    new URL("../../../../../marefa-product-sprint02-evidence-20261021/", import.meta.url),
  );
const images = readdirSync(directory)
  .filter((name) => /\.(png|jpg)$/.test(name))
  .sort()
  .map((name) => {
    const bytes = readFileSync(join(directory, name));
    return {
      file: name,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ...dimensions(bytes),
    };
  });
console.log(JSON.stringify({ storage: "outside-git-local-evidence", images }, null, 2));
