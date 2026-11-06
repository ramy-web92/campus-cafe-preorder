import { PrismaClient } from "@prisma/client";

// One shared client for the whole process (and for the tests).
export const prisma = new PrismaClient();
