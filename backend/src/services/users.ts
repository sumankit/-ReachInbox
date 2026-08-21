import { prisma } from "../lib/db";

/** Upserts the User row for whoever the verified JWT identifies. */
export async function ensureUser(payload: {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}) {
  return prisma.user.upsert({
    where: { googleId: payload.id },
    update: { email: payload.email, name: payload.name, avatarUrl: payload.picture },
    create: {
      googleId: payload.id,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    },
  });
}
