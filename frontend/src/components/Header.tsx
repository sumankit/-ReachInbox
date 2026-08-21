"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "./ui/Button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-slate-900">ReachInbox Scheduler</h1>
      {session?.user && (
        <div className="flex items-center gap-3">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User avatar"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-800">{session.user.name}</p>
            <p className="text-xs text-slate-500">{session.user.email}</p>
          </div>
          <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
            Logout
          </Button>
        </div>
      )}
    </header>
  );
}
