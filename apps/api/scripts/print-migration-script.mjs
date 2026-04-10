import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const migrationName = process.argv[2];

if (!migrationName) {
  console.error("Usage: node scripts/print-migration-script.mjs <migration_name>");
  process.exit(1);
}

const rows = await prisma.$queryRawUnsafe(
  `SELECT migration_name, script FROM "_prisma_migrations" WHERE migration_name = '${migrationName}'`
);

if (!Array.isArray(rows) || rows.length === 0) {
  console.log("NOT_FOUND");
} else {
  console.log(rows[0].script);
}

await prisma.$disconnect();
