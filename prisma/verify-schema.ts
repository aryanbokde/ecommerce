// NOTE: this project generates the Prisma client to a custom output
// (src/generated/prisma), so we import from there — NOT from "@prisma/client".
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  console.log("Tables created:", tables);
  await prisma.$disconnect();
}

main();
