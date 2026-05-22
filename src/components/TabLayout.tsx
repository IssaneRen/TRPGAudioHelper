import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wrench, BookOpen, Swords, Music, Map } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { useState, useRef } from "react";

const toolItems = [
  { to: "/tools/battle", label: "模拟战斗", icon: Swords },
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
    <div className="flex min-h-screen flex-col bg-background transition-colors duration-300">
      {/* 桌面端顶部导航 */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md nav-glow-line"
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
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

      {/* 页面内容区 - 带切换动画 */}
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6">
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
      </main>

      {/* 移动端底部导航 */}
      <nav className="sticky bottom-0 z-50 border-t bg-background/80 backdrop-blur-md sm:hidden">
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
          <NavLink
            to="/tools"
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
                <Wrench className="h-5 w-5" />
                工具箱
              </>
            )}
          </NavLink>
          <NavLink
            to="/blog"
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
