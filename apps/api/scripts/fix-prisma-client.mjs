import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * pnpm (and some Windows setups) can end up with @prisma/client missing the
 * internal ".prisma/client" folder that its own index.d.ts expects:
 *   export * from ".prisma/client/default"
 *
 * Prisma *does* generate the client under "<node_modules>/.prisma/client".
 * This script copies it into "@prisma/client/.prisma/client" so TS/ESLint
 * can see enums/models consistently.
 */
async function main() {
  // Resolve @prisma/client package directory
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve("@prisma/client/package.json");
  const prismaClientDir = path.dirname(pkgJsonPath);

  // "<node_modules>/@prisma/client" -> "<node_modules>"
  const nodeModulesDir = path.dirname(path.dirname(prismaClientDir));
  const generatedClientDir = path.join(nodeModulesDir, ".prisma", "client");
  const targetClientDir = path.join(prismaClientDir, ".prisma", "client");

  try {
    await fs.access(generatedClientDir);
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      `[fix-prisma-client] Skipping: missing generated client at ${generatedClientDir} (run "pnpm prisma:generate" first)`
    );
    return;
  }

  await fs.mkdir(path.dirname(targetClientDir), { recursive: true });

  // Copy (replace) generated client into @prisma/client/.prisma/client
  await fs.rm(targetClientDir, { recursive: true, force: true });
  await fs.cp(generatedClientDir, targetClientDir, { recursive: true });

  // eslint-disable-next-line no-console
  console.log(
    `[fix-prisma-client] Copied ${generatedClientDir} -> ${targetClientDir}`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[fix-prisma-client] Failed:", err);
  process.exitCode = 1;
});

