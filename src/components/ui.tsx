import type { ReactNode } from "react";

export function AppShell({
  children,
  tabBar,
}: {
  children: ReactNode;
  tabBar?: ReactNode;
}) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      {tabBar}
    </div>
  );
}

export function AppHead({
  title,
  badge,
  badgeNode,
}: {
  title: string;
  badge?: string;
  badgeNode?: ReactNode;
}) {
  return (
    <div className="apphead">
      <h2>{title}</h2>
      {badgeNode ?? <span className="wk">{badge}</span>}
    </div>
  );
}

export function Hash({ children }: { children: ReactNode }) {
  return (
    <div className="hash">
      <i />
      {children}
      <i />
    </div>
  );
}

export function Pill({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: "gold" | "red";
}) {
  return (
    <span className={`pill${variant ? ` ${variant}` : ""}`}>{children}</span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function TabBar({
  active,
  onChange,
  dimmed = false,
  isPro = false,
}: {
  active: string;
  onChange: (tab: string) => void;
  dimmed?: boolean;
  isPro?: boolean;
}) {
  const tabs = [
    { id: "team", label: isPro ? "Teams" : "Team" },
    { id: "ask", label: "Ask" },
    { id: "waivers", label: "Waivers" },
    { id: "more", label: "More" },
  ];

  return (
    <nav className="tabbar" style={dimmed ? { opacity: 0.35 } : undefined}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? "on" : ""}
          onClick={() => onChange(tab.id)}
        >
          <span className="ico" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
