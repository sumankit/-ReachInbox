import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; name?: string; picture?: string };
}

/**
 * The frontend (Next.js/NextAuth) owns the real Google OAuth flow. Once a
 * user is signed in, NextAuth mints a JWT signed with JWT_SHARED_SECRET
 * (== NEXTAUTH_SECRET) and the frontend sends it as a Bearer token. This
 * middleware just verifies that JWT — no OAuth logic is duplicated here.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtSharedSecret) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };
    req.user = { id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
