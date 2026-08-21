"use client";

import { useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { ChevronDownIcon, ClockIcon, SendIcon } from "./ui/Icons";

type Tab = "scheduled" | "sent";

export function Sidebar({
  tab,
  onTabChange,
  onCompose,
  scheduledCount,
  sentCount,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onCompose: () => void;
  scheduledCount: number;
  sentCount: number;
}) {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6">
      <span className="text-2xl font-black tracking-tight text-slate-900">ONB</span>

      <div className="relative mt-6">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-3 py-2.5 text-left"
        >
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User avatar"}
              width={36}
              height={36}
              className="rounded-full"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{session?.user?.name}</p>
            <p className="truncate text-xs text-slate-500">{session?.user?.email}</p>
          </div>
          <ChevronDownIcon className="shrink-0 text-slate-400" width={16} height={16} />
        </button>

        {profileOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onCompose}
        className="mt-4 rounded-full border border-brand-500 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
      >
        Compose
      </button>

      <p className="mb-2 mt-6 text-xs font-medium tracking-wide text-slate-400">CORE</p>
      <nav className="space-y-1">
        <NavItem
          label="Scheduled"
          icon={<ClockIcon width={18} height={18} />}
          count={scheduledCount}
          active={tab === "scheduled"}
          onClick={() => onTabChange("scheduled")}
        />
        <NavItem
          label="Sent"
          icon={<SendIcon width={18} height={18} />}
          count={sentCount}
          active={tab === "sent"}
          onClick={() => onTabChange("sent")}
        />
      </nav>
    </aside>
  );
}

function NavItem({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
        active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span className={active ? "text-brand-600" : "text-slate-400"}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className={active ? "text-brand-600" : "text-slate-400"}>{count}</span>
    </button>
  );
}
