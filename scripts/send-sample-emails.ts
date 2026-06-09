/**
 * Sends one of every email template to Mailtrap so the HTML can be reviewed.
 * Run (the react-server condition lets the `server-only` import resolve in Node):
 *   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/send-sample-emails.ts
 *
 * NOTE 1: email.ts reads EMAIL_PROVIDER at module load, so we load env + force the
 *   provider BEFORE dynamically importing it (static imports would hoist above this).
 * NOTE 2: Mailtrap's free plan rate-limits to a few emails/sec, so we throttle.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
process.env.EMAIL_PROVIDER = "smtp"; // always really send for previews

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const email = await import("../src/lib/email");

  const TO = "preview@example.com";
  const NAME = "Aarav Sharma";
  const ORDER = "MS-20260605-1042";
  const VERIFY_URL =
    "http://localhost:3000/verify-email?token=demo-verification-token";
  const RESET_URL =
    "http://localhost:3000/reset-password?token=demo-reset-token";

  const messages = [
    { ...email.verificationEmail(NAME, VERIFY_URL), to: TO },
    { ...email.resetPasswordEmail(NAME, RESET_URL), to: TO },
    { ...email.welcomeEmail(NAME), to: TO },
    { ...email.passwordChangedEmail(NAME), to: TO },
    email.orderConfirmationEmail(TO, {
      orderNumber: ORDER,
      total: 4798,
      items: [
        { name: "Classic Cotton T-Shirt", quantity: 2 },
        { name: "Canvas Sneakers", quantity: 1 },
      ],
    }),
    email.orderShippedEmail(TO, {
      orderNumber: ORDER,
      trackingNumber: "BLUEDART-7711882200",
    }),
    email.orderDeliveredEmail(TO, { orderNumber: ORDER }),
    email.orderCancelledEmail(TO, {
      orderNumber: ORDER,
      reason: "Item went out of stock",
      refundNeeded: true,
    }),
    { ...email.roleChangedEmail(NAME, { role: "shop_manager" }), to: TO },
    {
      ...email.accountBannedEmail(NAME, {
        reason: "Multiple policy violations",
      }),
      to: TO,
    },
  ];

  for (let i = 0; i < messages.length; i++) {
    const result = await email.sendEmail(messages[i]);
    console.log(
      `${result.skipped ? "⊘ skipped" : "✓ sent"}: ${messages[i].templateKey} (${messages[i].fallback.subject})`
    );
    if (i < messages.length - 1) await sleep(6000); // stay under Mailtrap's rate limit
  }
  console.log(`\nDone — ${messages.length} emails sent to Mailtrap.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
