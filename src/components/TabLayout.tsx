import { Outlet, NavLink } from "react-router";

const tabs = [
  { to: "/", label: "个人介绍", end: true },
  { to: "/module-tool", label: "模组工具", end: false },
  { to: "/blog", label: "博客杂谈", end: false },
];

export default function TabLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">TRPG Lucius Helper</h1>
          <nav className="hidden gap-1 sm:flex">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `rounded-md px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* 移动端底部导航 */}
      <nav className="border-t bg-background sm:hidden">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center py-3 text-xs transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
