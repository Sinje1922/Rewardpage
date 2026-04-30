import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { isOperator } from "../lib/roles.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
const patchSchema = z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});
router.patch("/:id", authRequired, async (req, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const sid = String(req.params.id);
    const sub = await prisma.submission.findUnique({
        where: { id: sid },
        include: { mission: { include: { campaign: true } } },
    });
    if (!sub) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    if (!isOperator(req.user.role)) {
        res.status(403).json({ error: "운영자만 제출을 처리할 수 있습니다." });
        return;
    }
    const updated = await prisma.submission.update({
        where: { id: sub.id },
        data: { status: parsed.data.status },
    });
    res.json(updated);
});
export default router;
