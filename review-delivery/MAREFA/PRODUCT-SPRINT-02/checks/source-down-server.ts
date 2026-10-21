// Isolated read-failure browser fixture. No real credentials or database writes.
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../../..");
const upstream = Bun.serve({
  hostname: "127.0.0.1",
  port: 4483,
  fetch(request) {
    return Response.json(
      { message: "SYNTHETIC_SOURCE_UNAVAILABLE" },
      {
        status: ["GET", "OPTIONS"].includes(request.method) ? 503 : 405,
        headers: { "access-control-allow-origin": "*" },
      },
    );
  },
});
const child = Bun.spawn([process.execPath, "run", "dev", "--host", "127.0.0.1", "--port", "4482"], {
  cwd: root,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: "http://127.0.0.1:4483",
    SUPABASE_URL: "http://127.0.0.1:4483",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_source_failure",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_source_failure",
  },
  stdout: "inherit",
  stderr: "inherit",
});
console.log("Synthetic source: 127.0.0.1:4483 / local app: 127.0.0.1:4482");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    child.kill();
    upstream.stop(true);
    process.exit(0);
  });
}
process.exitCode = await child.exited;
upstream.stop(true);
