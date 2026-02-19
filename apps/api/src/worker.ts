import { PgBoss } from "pg-boss";
import { registerDiscountCodeExpirationScan } from "./jobs/discount-code-expiration.scan.js";
import { registerDiscountCodeSettlementWorker } from "./jobs/discount-code-expiration.settle.js";
import { registerLeadNotificationWorker } from "./jobs/lead-notification.job.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run the worker");
  }

  const boss = new PgBoss({
    connectionString: databaseUrl,
    application_name: "pawgo-worker",
  });

  boss.on("error", (err) => {
    console.error("[worker] pg-boss error:", err);
  });

  await boss.start();
  console.log("[worker] started");

  await registerDiscountCodeExpirationScan(boss);
  await registerDiscountCodeSettlementWorker(boss);
  await registerLeadNotificationWorker(boss);

  console.log("[worker] jobs registered");
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
