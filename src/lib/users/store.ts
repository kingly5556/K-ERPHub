import bcrypt from "bcryptjs";
import usersConfig from "@/config/users.json";

export type UserRecord = {
  username: string;
  passwordHash: string;
  roles: string[];
  allowedModules: string[];
};

// NOTE: file-backed placeholder store for local development/scaffolding only.
// Replace with a real identity store (DB, LDAP, SSO provider, etc.) before production use.
const users = usersConfig as UserRecord[];

export async function verifyCredentials(
  username: string,
  password: string
): Promise<UserRecord | null> {
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}
