import jwt, { type SignOptions } from "jsonwebtoken";

const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";

export type JwtPayload = { sub: string; email: string; role: string };

export function signToken(payload: JwtPayload, expiresIn = "7d") {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
