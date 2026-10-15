"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ErphubLogo } from "@/components/erphub-logo";

// One-click demo accounts (see src/config/users.example.json). Shown only when
// NEXT_PUBLIC_DEMO_PASSWORD is set, so a real deployment can turn them off.
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
const DEMO_ACCOUNTS = [
  { username: "demo.purchasing", label: "Purchasing", hint: "สร้าง / ส่ง PO" },
  { username: "demo.manager", label: "Manager", hint: "อนุมัติ PO เกิน 50,000" },
  { username: "demo.warehouse", label: "Warehouse", hint: "รับของ / ปรับสต็อก" },
  { username: "demo.accountant", label: "Accountant", hint: "บันทึกบัญชี / รายงาน" },
  { username: "demo.admin", label: "Admin", hint: "ทุกอย่าง + ปิดงวด" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Start waking the (free-tier) module backends while the visitor picks a role.
  useEffect(() => {
    fetch("/api/warmup", { method: "POST" }).catch(() => {});
  }, []);

  async function login(user: string, pass: string) {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Login failed.");
        return;
      }

      // Only same-origin paths: "/x" is fine, "//evil.com" or "https://..." is not.
      const requested = searchParams.get("next");
      const next =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : "/erphub";
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void login(username, password);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="space-y-1">
        <ErphubLogo />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to access your ERP modules
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="username"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {DEMO_PASSWORD && (
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ลองใช้งานทันทีตาม role · ข้อมูล demo รีเซ็ตทุกคืน 03:00 · ครั้งแรกอาจรอประมาณ 1 นาที
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                disabled={loading}
                onClick={() => void login(account.username, DEMO_PASSWORD)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-left text-sm transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-indigo-950/40"
              >
                <span className="block font-medium text-slate-800 dark:text-slate-100">
                  {account.label}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {account.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
