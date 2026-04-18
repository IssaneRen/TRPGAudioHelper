import { Outlet, NavLink, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { User, Map, BookOpen } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const tabs = [
  { to: "/", label: "个人介绍", end: true, icon: User },
  { to: "/module-tool", label: "模组工具", end: false, icon: Map },
  { to: "/blog", label: "博客杂谈", end: false, icon: BookOpen },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function TabLayout() {
  const location = useLocation();

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
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
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
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <ModeToggle />
          </div>
        </div>
      </motion.header>

      {/* 页面内容区 - 带切换动画 */}
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
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
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
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
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
