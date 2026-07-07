import type { ReactNode, SVGProps } from "react";

function TabIcon({
  id,
  ...props
}: SVGProps<SVGSVGElement> & { id: string }) {
  const shared = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (id) {
    case "team":
      return (
        <svg {...shared}>
          <path d="M5 8.5h14" />
          <path d="M7 8.5V17" />
          <path d="M12 8.5V17" />
          <path d="M17 8.5V17" />
          <path d="M6 17h12" />
          <path d="M9 5.5 12 8l3-2.5" />
        </svg>
      );
    case "ask":
      return (
        <svg {...shared}>
          <path d="M6.5 7.5h11a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H11l-3.5 3v-3H6.5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2z" />
          <path d="M9.5 11h5" />
          <path d="M9.5 13.5h3" />
        </svg>
      );
    case "waivers":
      return (
        <svg {...shared}>
          <circle cx="9.5" cy="8.5" r="3" />
          <path d="M5 17.5v-1a4.5 4.5 0 0 1 9 0v1" />
          <path d="M17.5 8.5v6" />
          <path d="M14.5 11.5h6" />
        </svg>
      );
    case "more":
      return (
        <svg {...shared}>
          <path d="M5.5 7.5h13" />
          <path d="M5.5 12h13" />
          <path d="M5.5 16.5h13" />
          <circle cx="18" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

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
    {
      id: "team",
      label: isPro ? "Teams" : "My Team",
      hint: isPro ? "All leagues" : "Roster",
    },
    { id: "ask", label: "Ask AI", hint: "Coach chat" },
    { id: "waivers", label: "Waivers", hint: "Add players" },
    { id: "more", label: "More", hint: "Menu" },
  ];

  return (
    <nav
      className="tabbar"
      aria-label="Main navigation"
      style={dimmed ? { opacity: 0.35 } : undefined}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? "on" : ""}
            onClick={() => onChange(tab.id)}
            aria-label={`${tab.label}: ${tab.hint}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="ico">
              <TabIcon id={tab.id} />
            </span>
            <span className="tab-copy">
              <span className="tab-label">{tab.label}</span>
              <span className="tab-hint">{tab.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
