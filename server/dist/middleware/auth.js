import { verifyToken } from "../lib/jwt.js";
export function authOptional(req, _res, next) {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer "))
        return next();
    try {
        const p = verifyToken(h.slice(7));
        req.user = { id: p.sub, email: p.email, role: p.role };
    }
    catch {
        /* ignore */
    }
    next();
}
export function authRequired(req, res, next) {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const p = verifyToken(h.slice(7));
        req.user = { id: p.sub, email: p.email, role: p.role };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
export function requireRoles(...roles) {
    return (req, res, next) => {
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
