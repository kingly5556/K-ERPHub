import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6 dark:from-slate-950 dark:to-slate-900">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
