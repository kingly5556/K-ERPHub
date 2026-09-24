import Link from "next/link";
import { redirect } from "next/navigation";
import { ErphubLogo } from "@/components/erphub-logo";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth/session";
import { getModulesForUser } from "@/lib/modules/registry";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/erphub/login");
  }

  const modules = getModulesForUser(session.allowedModules);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <ErphubLogo />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Signed in as
              </p>
              <p className="text-sm font-medium">{session.username}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          ERP Modules
        </h1>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          Pick a module to continue — you&apos;re carried in with the same
          session.
        </p>

        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No modules assigned to your account yet. Contact your
            administrator to get access.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <li key={m.key}>
                <Link
                  href={`/erp/${m.key}`}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xl dark:bg-indigo-950">
                    {m.icon ?? "📦"}
                  </span>
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      /erp/{m.key}
                    </p>
                  </div>
                  <span className="mt-auto text-sm font-medium text-indigo-600 group-hover:underline dark:text-indigo-400">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        ERPHUB — modular ERP gateway
      </footer>
    </div>
  );
}
