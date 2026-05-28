import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { BookOpen, Users, Shield, Star, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ModulePreviewCard } from "@/features/modules/ModulePreviewCard";
import type { WikiIndexPayload } from "@/types/wiki";
import type { LucideIcon } from "lucide-react";

const Live2DBackground = lazy(() =>
  import("./Live2DBackground").then((m) => ({ default: m.Live2DBackground }))
);

type ModuleStatus = "prepared" | "pending" | "completed";

interface ProfileConfig {
  name: string;
  subtitle: string;
  bio: string;
  disclaimer: string;
  live2dModelPath: string;
  stats: { label: string; value: string; icon: string }[];
  philosophies: { title: string; desc: string }[];
  modules: {
    id: string;
    name: string;
    status: ModuleStatus;
    description: string;
    playerCount: string;
    duration: string;
    tags: string[];
  }[];
  contacts: { label: string; value: string }[];
}

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Star,
  Users,
  MessageCircle,
};

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

let profileCache: ProfileConfig | null = null;
let wikiIndexCache: WikiIndexPayload | null = null;

export default function ProfileTab() {
  const [profile, setProfile] = useState<ProfileConfig | null>(profileCache);
  const [wikiIndex, setWikiIndex] = useState<WikiIndexPayload | null>(wikiIndexCache);
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, shouldReduceMotion ? 1 : 0]);

  useEffect(() => {
    if (profileCache) return;
    fetch("/config/profile.json")
      .then((r) => r.json())
      .then((data: ProfileConfig) => {
        profileCache = data;
        setProfile(data);
      });
  }, []);

  useEffect(() => {
    if (wikiIndexCache) return;
    fetch("/wiki/index.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: WikiIndexPayload) => {
        wikiIndexCache = data;
        setWikiIndex(data);
      })
      .catch(() => {
        // Profile 页不强依赖 wiki index，失败时保持仅展示 profile.json 自带内容
      });
  }, []);

  const modulesForProfile = useMemo(() => {
    if (!profile) return [];
    if (!wikiIndex) return [];
    const modulesById = new Map((wikiIndex.modules || []).map((item) => [item.id, item]));
    return profile.modules
      .map((mod) => modulesById.get(mod.id) ?? null)
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [profile, wikiIndex]);

  const noMotion = { hidden: {}, visible: {} };
  const noMotionStagger = { hidden: {}, visible: {} };
  const effectiveFadeInUp = shouldReduceMotion ? noMotion : fadeInUp;
  const effectiveFadeInLeft = shouldReduceMotion ? noMotion : fadeInLeft;
  const effectiveFadeInRight = shouldReduceMotion ? noMotion : fadeInRight;
  const effectiveScaleIn = shouldReduceMotion ? noMotion : scaleIn;
  const effectiveStagger = shouldReduceMotion ? noMotionStagger : staggerContainer;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ===== Section 1: Hero ===== */}
      <section ref={heroRef} className="relative flex min-h-[50vh] sm:min-h-[70vh] items-center justify-center overflow-hidden -mx-4 -mt-6 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, oklch(0.55 0.12 160 / 15%) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, oklch(0.45 0.10 290 / 15%) 0%, transparent 50%)`
        }} />
        {!shouldReduceMotion && (
          <Suspense fallback={null}>
            <motion.div
              style={{ y: heroY, opacity: heroOpacity }}
              className="absolute inset-0 z-[1]"
            >
              <Live2DBackground
                modelPath={profile.live2dModelPath}
                opacity={0.4}
                className="h-full w-full"
              />
            </motion.div>
          </Suspense>
        )}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center space-y-6 max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {profile.name}
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            {profile.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="pt-8 text-sm text-muted-foreground"
          >
            向下滚动探索更多
          </motion.div>
        </motion.div>
      </section>

      {/* ===== Section 2: 个人介绍 ===== */}
      <section className="py-20 -mx-4 px-4" style={{
        background: "linear-gradient(180deg, transparent 0%, oklch(0.55 0.12 160 / 4%) 50%, transparent 100%)"
      }}>
        <motion.div
          variants={effectiveFadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8">关于我</h2>
          <Card className="profile-hero eldritch-card overflow-hidden">
            <svg className="rune-corner top-3 right-3" viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M30 5 L30 55 M5 30 L55 30 M12 12 L48 48 M48 12 L12 48" stroke="currentColor" strokeWidth="0.5" />
            </svg>
            <CardContent className="pt-6 space-y-4">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ===== Section 3: 数据统计 ===== */}
      <section className="py-20 -mx-4 px-4">
        <motion.div
          variants={effectiveStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <motion.h2
            variants={effectiveFadeInUp}
            className="text-3xl font-bold text-center mb-12"
          >
            数据一览
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {profile.stats.map((stat) => {
              const Icon = iconMap[stat.icon] || BookOpen;
              return (
                <motion.div key={stat.label} variants={effectiveScaleIn} className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ===== Section 4: 跑团理念 ===== */}
      <section className="py-20 -mx-4 px-4" style={{
        background: "linear-gradient(180deg, transparent 0%, oklch(0.45 0.10 290 / 4%) 50%, transparent 100%)"
      }}>
        <motion.div
          variants={effectiveStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <motion.h2
            variants={effectiveFadeInUp}
            className="text-3xl font-bold text-center mb-12"
          >
            跑团理念
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-6">
            {profile.philosophies.map((p, i) => (
              <motion.div
                key={p.title}
                variants={i % 2 === 0 ? effectiveFadeInLeft : effectiveFadeInRight}
              >
                <Card className="h-full eldritch-card">
                  <CardContent className="pt-6 space-y-2">
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===== Section 5: 模组列表 ===== */}
      <section className="py-20 -mx-4 px-4">
        <motion.div
          variants={effectiveFadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-4">模组库</h2>
          <p className="text-center text-muted-foreground mb-8">我的模组收藏</p>

          {profile.modules.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">暂无模组</p>
            </div>
          ) : (
            <motion.div
              variants={effectiveStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {(modulesForProfile.length > 0 ? modulesForProfile : []).map((module) => (
                <motion.div
                  key={module.id}
                  variants={effectiveScaleIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Link to={`/tools/world-wiki/modules/${module.id}`} className="block">
                    <ModulePreviewCard module={module} />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
          <div className="mt-8 flex justify-center">
            <Button variant="outline" asChild>
              <Link to="/tools/world-wiki/modules">更多模组</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ===== Section 6: 免责声明 ===== */}
      <section className="py-20 -mx-4 px-4" style={{
        background: "linear-gradient(180deg, transparent 0%, oklch(0.55 0.12 160 / 4%) 50%, transparent 100%)"
      }}>
        <motion.div
          variants={effectiveFadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <Shield className="mx-auto h-10 w-10 text-primary/60" />
          <h2 className="text-3xl font-bold">免责声明与跑团要求</h2>
          <p className="text-muted-foreground leading-relaxed">
            {profile.disclaimer}
          </p>
        </motion.div>
      </section>

      {/* ===== Section 7: 联系与社交 ===== */}
      <section className="py-20 -mx-4 px-4 mb-8">
        <motion.div
          variants={effectiveStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-xl mx-auto text-center space-y-8"
        >
          <motion.h2
            variants={effectiveFadeInUp}
            className="text-3xl font-bold"
          >
            一起开始冒险
          </motion.h2>
          <motion.p variants={effectiveFadeInUp} className="text-muted-foreground">
            如果你对跑团感兴趣，或者想了解更多关于我的模组，欢迎通过以下方式联系我。
          </motion.p>
          <motion.div variants={effectiveScaleIn} className="flex flex-wrap justify-center gap-4">
            {profile.contacts.map((contact) => (
              <Card key={contact.label} className="px-6 py-4 eldritch-card text-center">
                <div className="text-sm text-muted-foreground">{contact.label}</div>
                <div className="font-bold mt-1">{contact.value}</div>
              </Card>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
