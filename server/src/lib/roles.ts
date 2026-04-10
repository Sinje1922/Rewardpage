export function isOperator(role: string | undefined) {
  return role === "ADMIN" || role === "MANAGER";
}
