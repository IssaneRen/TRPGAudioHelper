import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wrench, BookOpen, Swords, Music, Map, LibraryBig } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { useState, useRef, useEffect } from "react";

const toolItems = [
  { to: "/tools/battle", label: "模拟战斗", icon: Swords },
  { to: "/tools/world-wiki", label: "世界 wiki", icon: LibraryBig },
  { to: "/tools/soundboard", label: "音效键盘", icon: Music },
  { to: "/tools/module-clue", label: "模组工具", icon: Map },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function TabLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const animationKey = location.pathname.startsWith("/tools")
    ? "/tools"
    : location.pathname.startsWith("/blog")
      ? "/blog"
      : location.pathname;

  const isToolsActive = location.pathname.startsWith("/tools");

  const [toolsOpen, setToolsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setToolsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setToolsOpen(false), 150);
  };

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background transition-colors duration-300">
      {/* 桌面端顶部导航 */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-50 shrink-0 border-b bg-background/80 backdrop-blur-md nav-glow-line"
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 sm:pr-5">
          <motion.h1
            className="text-lg font-bold tracking-wider"
            style={{ fontFamily: "var(--font-heading)" }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            TRPG Lucius Helper
          </motion.h1>

          <div className="flex items-center gap-2">
            <nav className="hidden gap-1 sm:flex">
              {/* TAB1: 个人介绍 */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `relative rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-md bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      个人介绍
                    </span>
                  </>
                )}
              </NavLink>

              {/* TAB2: 工具箱 (hover dropdown) */}
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => navigate("/tools")}
                  className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isToolsActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isToolsActive && (
                    <motion.span
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-md bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Wrench className="h-4 w-4" />
                    工具箱
                  </span>
                </button>

                <AnimatePresence>
                  {toolsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1 z-50 min-w-[10rem] rounded-md border bg-popover p-1 shadow-md"
                    >
                      {toolItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setToolsOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                            }`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* TAB3: 博客杂谈 */}
              <NavLink
                to="/blog"
                className={({ isActive }) =>
                  `relative rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-md bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      博客杂谈
                    </span>
                  </>
                )}
              </NavLink>
            </nav>
            <ModeToggle />
          </div>
        </div>
      </motion.header>

      {/* 页面内容区 - 独立滚动，避免 body 滚动条导致顶栏宽度抖动 */}
      <main className="app-scroll-area mx-auto w-full max-w-screen-xl flex-1 overflow-y-auto px-4 py-6 sm:pr-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={animationKey}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <footer className="mt-12 border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            沪ICP备2025112187号-2
          </a>
        </footer>
      </main>

      {/* 移动端底部导航 */}
      <nav className="sticky bottom-0 z-50 shrink-0 border-t bg-background/80 backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-around">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors duration-200 ${
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="activeMobileTab"
                    className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <User className="h-5 w-5" />
                个人介绍
              </>
            )}
          </NavLink>
          <MobileToolsMenu />
          <NavLink
            to="/blog"
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors duration-200 ${
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="activeMobileTab"
                    className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <BookOpen className="h-5 w-5" />
                博客杂谈
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

function MobileToolsMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname.startsWith("/tools");

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative flex flex-1 flex-col items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex flex-col items-center gap-0.5 py-3 text-xs transition-colors duration-200 ${
          isActive ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="activeMobileTab"
            className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Wrench className="h-5 w-5" />
        工具箱
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 z-50 min-w-[8rem] rounded-lg border bg-popover p-1 shadow-lg"
          >
            {toolItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setOpen(false); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
