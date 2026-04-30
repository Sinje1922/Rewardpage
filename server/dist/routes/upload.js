import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import { authRequired, requireRoles } from "../middleware/auth.js";
const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });
const allowed = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsRoot);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".png";
        cb(null, `${randomUUID()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (allowed.has(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("이미지 파일(JPEG, PNG, GIF, WebP, SVG)만 업로드할 수 있습니다."));
        }
    },
});
const router = Router();
router.post("/logo", authRequired, requireRoles("MANAGER", "ADMIN"), (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            const msg = err instanceof Error ? err.message : "업로드 실패";
            res.status(400).json({ error: msg });
            return;
        }
        next();
    });
}, (req, res) => {
    const f = req.file;
    if (!f) {
        res.status(400).json({ error: "파일이 없습니다." });
        return;
    }
    const publicPath = `/uploads/${f.filename}`;
    res.status(201).json({ url: publicPath });
});
export default router;
