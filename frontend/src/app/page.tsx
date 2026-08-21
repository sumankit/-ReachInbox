"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GoogleIcon } from "@/components/ui/Icons";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailLoginNotice, setEmailLoginNotice] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    // Only real Google OAuth is wired up on the backend for this assignment;
    // the email/password fields are kept for visual parity with the Figma
    // login screen but intentionally point users at Google sign-in.
    setEmailLoginNotice(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 p-10 shadow-sm">
        <h1 className="text-center text-4xl font-extrabold text-slate-900">Login</h1>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-brand-50 py-3.5 text-[15px] font-medium text-slate-800 transition hover:bg-brand-100"
        >
          <GoogleIcon />
          Login with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or sign up through email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email ID"
            className="w-full rounded-2xl bg-slate-100 px-5 py-3.5 text-[15px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl bg-slate-100 px-5 py-3.5 text-[15px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {emailLoginNotice && (
            <p className="text-xs text-slate-500">
              Email/password sign-in isn&apos;t enabled for this demo — please use &ldquo;Login with Google&rdquo; above.
            </p>
          )}
          <button
            type="submit"
            className="mt-2 w-full rounded-2xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-700"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
