import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

export type AuthedRequest = Request & {
  user?: { id: string; email: string; role: string };
};

export function authOptional(req: AuthedRequest, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return next();
  try {
    const p = verifyToken(h.slice(7));
    req.user = { id: p.sub, email: p.email, role: p.role };
  } catch {
    /* ignore */
  }
  next();
}

export function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const p = verifyToken(h.slice(7));
    req.user = { id: p.sub, email: p.email, role: p.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRoles(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
