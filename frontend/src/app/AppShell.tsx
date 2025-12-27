"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  const navItems: Array<{ href: string; label: string }> = [
    { href: "/", label: "Dashboard" },
    { href: "/agenda", label: "Agenda" },
    { href: "/tasks-projects", label: "Tâches & Projets" },
    { href: "/agent", label: "Agent" },
    { href: "/study", label: "Étude" },
    { href: "/automations", label: "Automations" },
    { href: "/commands", label: "Commandes" },
    { href: "/feedback", label: "Feedback" },
    { href: "/commentaires-dev", label: "Commentaires dev" },
    { href: "/admin/dev-comments", label: "Admin commentaires" },
    { href: "/links", label: "Liens" },
    { href: "/settings", label: "Paramètres" },
  ];

  const activeHref = pathname === "/" ? "/" : pathname?.split("?")[0];

  return (
    <div className="min-h-screen bg-transparent text-[color:var(--foreground)]">
      {hideNav ? null : (
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6">
          <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-3 text-sm font-semibold text-slate-700 shadow-sm">
            {navItems.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 transition hover:bg-slate-900 hover:text-white ${
                    isActive ? "bg-slate-900 text-white" : "bg-transparent"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <main className="min-h-screen px-4 pb-10 pt-6 md:px-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
