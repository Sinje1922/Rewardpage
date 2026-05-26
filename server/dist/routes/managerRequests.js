import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.use(authRequired);
const createRequestSchema = z.object({
    companyName: z.string().min(1, "Company name is required").max(100),
    contactName: z.string().min(1, "Contact name is required").max(100),
    email: z.string().email("Invalid email address").max(100),
    phone: z.string().max(20).optional().nullable(),
    businessType: z.string().min(1, "Business type is required").max(100),
    message: z.string().min(1, "Message is required").max(1000),
});
// Submit a manager request
router.post("/", async (req, res) => {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const userId = req.user.id;
    // Check user's current role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    if (user.role === "MANAGER" || user.role === "ADMIN") {
        res.status(400).json({ error: "You already have Manager or Admin permissions." });
        return;
    }
    // Check if there is already a PENDING request
    const existingPending = await prisma.managerrequest.findFirst({
        where: { userId, status: "PENDING" },
    });
    if (existingPending) {
        res.status(400).json({ error: "You already have a pending request. Please wait for admin approval." });
        return;
    }
    const request = await prisma.managerrequest.create({
        data: {
            ...parsed.data,
            userId,
            status: "PENDING",
        },
    });
    res.status(201).json(request);
});
// Get current user's requests
router.get("/my", async (req, res) => {
    const requests = await prisma.managerrequest.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
    });
    res.json(requests);
});
export default router;
