// Prints a bcrypt hash for users.example.json.
// usage: node scripts/hash-password.mjs "<password>"
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('usage: node scripts/hash-password.mjs "<password>"');
  process.exit(1);
}
console.log(await bcrypt.hash(password, 10));
