import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";

const workspaceRoot = path.resolve(process.cwd(), "..");
const distDir = path.resolve(process.cwd(), "dist");
const artifactsDir = path.resolve(
  workspaceRoot,
  "infra",
  "localstack",
  "artifacts"
);

const lambdas = [
  "uploadBook",
  "listBooks",
  "getBook",
  "deleteBook",
  "signup",
  "login",
  "me",
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await mkdir(artifactsDir, { recursive: true });

for (const name of lambdas) {
  const entry = path.resolve(process.cwd(), "lambdas", name, "index.ts");
  const outdir = path.resolve(distDir, name);

  await mkdir(outdir, { recursive: true });

  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: path.resolve(outdir, "index.js"),
    sourcemap: false,
    minify: false,
    external: [],
  });

  // Lambda Node.js runtimes load CommonJS handler.
  // We keep CJS output and write a tiny package.json to avoid ESM ambiguity.
  await writeFile(
    path.resolve(outdir, "package.json"),
    JSON.stringify({ type: "commonjs" }, null, 2)
  );

  const zip = new AdmZip();
  zip.addLocalFolder(outdir);
  const zipPath = path.resolve(artifactsDir, `${name}.zip`);
  zip.writeZip(zipPath);

  console.log(`Built ${name} -> ${path.relative(workspaceRoot, zipPath)}`);
}
