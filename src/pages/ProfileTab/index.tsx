import { useState, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Plus, Download, Upload, Edit3, Trash2, BookOpen, Users, Shield, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useProfileStore } from "@/stores/use-profile-store";
import { downloadJson, importFromJson } from "@/utils/json-io";
import { toast } from "sonner";
import type { Module, ModuleStatus } from "@/types";
import { ModuleDialog } from "./ModuleDialog";
import { ProfileEditor } from "./ProfileEditor";

const statusConfig: Record<ModuleStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  prepared: { label: "已备", variant: "default" },
  pending: { label: "待备", variant: "secondary" },
  completed: { label: "已带", variant: "outline" },
};

// 滚动触发动画 variants
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

// 虚假统计数据
const stats = [
  { label: "带团场次", value: "128+", icon: BookOpen },
  { label: "经手模组", value: "47", icon: Star },
  { label: "服务玩家", value: "300+", icon: Users },
  { label: "平均评分", value: "9.2", icon: MessageCircle },
];

// 跑团理念
const philosophies = [
  { title: "沉浸至上", desc: "每一个细节都服务于故事的沉浸感。从环境描写到NPC的微表情，让玩家忘记自己在玩游戏。" },
  { title: "玩家主导", desc: "故事的走向永远掌握在玩家手中。KP只是世界的塑造者，而非故事的独裁者。" },
  { title: "安全第一", desc: "恐怖与乐趣之间有一条线。我会确保每位玩家都在安全且舒适的范围内体验故事。" },
  { title: "精心准备", desc: "每个模组都经过反复推敲和打磨。线索链的完整性、节奏的张弛有度，都是必不可少的。" },
];

export default function ProfileTab() {
  const { profile, updateProfile, addModule, updateModule, removeModule, setProfile } =
    useProfileStore();
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [filter, setFilter] = useState<ModuleStatus | "all">("all");

  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, shouldReduceMotion ? 1 : 0]);

  // 减弱动效时使用空 variants
  const noMotion = { hidden: {}, visible: {} };
  const noMotionStagger = { hidden: {}, visible: {} };
  const effectiveFadeInUp = shouldReduceMotion ? noMotion : fadeInUp;
  const effectiveFadeInLeft = shouldReduceMotion ? noMotion : fadeInLeft;
  const effectiveFadeInRight = shouldReduceMotion ? noMotion : fadeInRight;
  const effectiveScaleIn = shouldReduceMotion ? noMotion : scaleIn;
  const effectiveStagger = shouldReduceMotion ? noMotionStagger : staggerContainer;

  const filteredModules =
    filter === "all"
      ? profile.modules
      : profile.modules.filter((m) => m.status === filter);

  const handleExport = () => {
    downloadJson(
      { version: "1.0.0", exportedAt: new Date().toISOString(), profile },
      `trpg-profile-${Date.now()}.json`
    );
    toast.success("导出成功");
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = await importFromJson(file);
        if (data.profile) {
          setProfile(data.profile);
          toast.success("导入成功");
        } else {
          toast.error("未找到个人资料数据");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "导入失败");
      }
    };
    input.click();
  };

  const handleSaveModule = (mod: Module) => {
    if (editingModule) {
      updateModule(mod.id, mod);
    } else {
      addModule({ ...mod, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setIsDialogOpen(false);
    toast.success(editingModule ? "模组已更新" : "模组已添加");
  };

  return (
    <div className="space-y-0">
      {/* ===== Section 1: Hero ===== */}
      <section ref={heroRef} className="relative flex min-h-[50vh] sm:min-h-[70vh] items-center justify-center overflow-hidden -mx-4 -mt-6 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, oklch(0.55 0.12 160 / 15%) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, oklch(0.45 0.10 290 / 15%) 0%, transparent 50%)`
        }} />
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
              {profile.name || "Lucius"}
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            TRPG Keeper / 模组设计师 / 故事编织者
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex justify-center gap-3"
          >
            <Button variant="outline" size="sm" onClick={() => setIsProfileEditing(true)}>
              <Edit3 className="mr-1 h-4 w-4" /> 编辑资料
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1 h-4 w-4" /> 导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="mr-1 h-4 w-4" /> 导入
            </Button>
          </motion.div>
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

      {/* ===== Section 2: 个人介绍（可编辑） ===== */}
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
          <h2 className="text-3xl font-bold text-center mb-8">
            关于我
          </h2>
          {isProfileEditing ? (
            <Card className="profile-hero eldritch-card">
              <CardContent className="pt-6">
                <ProfileEditor
                  profile={profile}
                  onSave={(p) => {
                    updateProfile(p);
                    setIsProfileEditing(false);
                    toast.success("资料已更新");
                  }}
                  onCancel={() => setIsProfileEditing(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="profile-hero eldritch-card overflow-hidden">
              <svg className="rune-corner top-3 right-3" viewBox="0 0 60 60" aria-hidden="true">
                <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <path d="M30 5 L30 55 M5 30 L55 30 M12 12 L48 48 M48 12 L12 48" stroke="currentColor" strokeWidth="0.5" />
              </svg>
              <CardContent className="pt-6 space-y-4">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {profile.bio || "一位热爱克苏鲁神话的 TRPG 主持人，致力于为每位玩家创造难忘的跑团体验。从迷雾笼罩的维多利亚时代到星际之间的虚空，每一场冒险都是一段独特的旅程。"}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setIsProfileEditing(true)} className="mt-2">
                  <Edit3 className="mr-1 h-3 w-3" /> 编辑
                </Button>
              </CardContent>
            </Card>
          )}
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
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={effectiveScaleIn} className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
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
            {philosophies.map((p, i) => (
              <motion.div
                key={p.title}
                variants={i % 2 === 0 ? effectiveFadeInLeft : effectiveFadeInRight}
              >
                <Card className="h-full eldritch-card">
                  <CardContent className="pt-6 space-y-2">
                    <h3 className="text-lg font-bold">
                      {p.title}
                    </h3>
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
          <h2 className="text-3xl font-bold text-center mb-4">
            模组库
          </h2>
          <p className="text-center text-muted-foreground mb-8">管理和展示我的模组收藏</p>

          {/* 工具栏 */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <Button onClick={() => { setEditingModule(null); setIsDialogOpen(true); }} size="sm">
              <Plus className="mr-1 h-4 w-4" /> 添加模组
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6" />
            {(["all", "prepared", "pending", "completed"] as const).map((s) => (
              <Button
                key={s}
                variant={filter === s ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "全部" : statusConfig[s].label}
                {s !== "all" && (
                  <Badge variant="secondary" className="ml-1">
                    {profile.modules.filter((m) => m.status === s).length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* 模组卡片 */}
          {filteredModules.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">暂无模组，点击"添加模组"开始</p>
            </div>
          ) : (
            <motion.div
              variants={effectiveStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredModules.map((mod) => (
                <motion.div
                  key={mod.id}
                  variants={effectiveScaleIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Card className="group relative h-full eldritch-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{mod.name}</CardTitle>
                        <Badge variant={statusConfig[mod.status].variant}>
                          {statusConfig[mod.status].label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {mod.description || "暂无描述"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {mod.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {mod.playerCount && <span>{mod.playerCount} 人</span>}
                        {mod.duration && <span>{mod.duration}</span>}
                      </div>
                      <div className="flex gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingModule(mod); setIsDialogOpen(true); }}>
                          <Edit3 className="mr-1 h-3 w-3" /> 编辑
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                          onClick={() => { removeModule(mod.id); toast.success("模组已删除"); }}>
                          <Trash2 className="mr-1 h-3 w-3" /> 删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
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
          <h2 className="text-3xl font-bold">
            免责声明与跑团要求
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {profile.disclaimer || "本人所有跑团活动均为娱乐目的。参与者需年满18岁，且了解TRPG的基本规则。所有模组内容均为虚构，与现实无关。跑团过程中如感到不适，请随时告知KP暂停或退出。我们尊重每一位玩家的感受，安全牌（X卡机制）全程有效。"}
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
            <Card className="px-6 py-4 eldritch-card text-center">
              <div className="text-sm text-muted-foreground">QQ群</div>
              <div className="font-bold mt-1">123456789</div>
            </Card>
            <Card className="px-6 py-4 eldritch-card text-center">
              <div className="text-sm text-muted-foreground">微信</div>
              <div className="font-bold mt-1">LuciusTRPG</div>
            </Card>
            <Card className="px-6 py-4 eldritch-card text-center">
              <div className="text-sm text-muted-foreground">B站</div>
              <div className="font-bold mt-1">@Lucius跑团</div>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* 模组编辑弹窗 */}
      <ModuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        module={editingModule}
        onSave={handleSaveModule}
      />
    </div>
  );
}
