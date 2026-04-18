import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BlogPost } from "@/types";

const demoPosts: BlogPost[] = [
  {
    id: "1",
    title: "如何设计一个好的 TRPG 模组",
    content: `## 核心要素

一个好的模组需要具备以下要素：

1. **引人入胜的开场** — 第一印象决定玩家的投入程度
2. **清晰的线索链** — 玩家需要知道"下一步该做什么"
3. **有意义的选择** — 每个决定都应该有后果
4. **张弛有度的节奏** — 紧张与放松交替

### 线索设计技巧

> 好的线索设计就像面包屑，玩家总能找到下一个。

- 主线线索不应该藏得太深
- 支线线索可以增加深度，但不应该阻塞主线
- 给予玩家**多条路径**到达同一个目的地`,
    category: "blog",
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2024-03-15T10:00:00Z",
    tags: ["TRPG", "模组设计", "教程"],
  },
  {
    id: "2",
    title: "跑团记录：迷雾之城",
    content: `## 第一幕：到达

玩家们在一个雨夜抵达了小镇。镇上的人都很冷漠，只有旅馆老板勉强接待了他们。

当晚，旅馆外传来了奇怪的声音...

### 关键转折

当调查员发现了 **神秘信件** 后，故事开始加速。信件中提到了一个被遗忘的地下室。

*"如果你正在读这封信，说明我已经不在了。请找到花瓶下的钥匙。"*`,
    category: "misc",
    createdAt: "2024-04-01T14:00:00Z",
    updatedAt: "2024-04-01T14:00:00Z",
    tags: ["跑团记录", "迷雾之城"],
  },
  {
    id: "3",
    title: "推荐：五个适合新手的模组",
    content: `适合 TRPG 新手的入门模组推荐：

| 模组名 | 类型 | 人数 | 时长 |
|--------|------|------|------|
| 纸上谈兵 | 推理 | 3-4 | 2-3h |
| 雪夜密室 | 恐怖 | 4-5 | 4-5h |
| 星际迷航 | 科幻 | 3-6 | 3-4h |
| 花园杀人事件 | 推理 | 4-5 | 3-4h |
| 古堡惊魂 | 恐怖 | 3-5 | 4-6h |

每个模组都有完整的 KP 指引，非常适合第一次带团的新手 KP。`,
    category: "blog",
    createdAt: "2024-04-10T09:00:00Z",
    updatedAt: "2024-04-10T09:00:00Z",
    tags: ["推荐", "新手", "模组"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function BlogTab() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const blogPosts = demoPosts.filter((p) => p.category === "blog");
  const miscPosts = demoPosts.filter((p) => p.category === "misc");

  if (selectedPost) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <button
          onClick={() => setSelectedPost(null)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; 返回列表
        </button>
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-a:text-primary prose-blockquote:border-l-primary/50">
          <h1 className="text-2xl font-bold">{selectedPost.title}</h1>
          <div className="flex gap-2 mb-4">
            {selectedPost.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <time className="text-sm text-muted-foreground">
            {new Date(selectedPost.createdAt).toLocaleDateString("zh-CN")}
          </time>
          <Markdown remarkPlugins={[remarkGfm]}>{selectedPost.content}</Markdown>
        </article>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Tabs defaultValue="blog">
        <TabsList>
          <TabsTrigger value="blog" className="gap-1.5">
            <BookOpen className="h-4 w-4" /> 博客
          </TabsTrigger>
          <TabsTrigger value="misc" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> 杂谈
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blog">
          <PostList posts={blogPosts} onSelect={setSelectedPost} />
        </TabsContent>
        <TabsContent value="misc">
          <PostList posts={miscPosts} onSelect={setSelectedPost} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function PostList({
  posts,
  onSelect,
}: {
  posts: BlogPost[];
  onSelect: (post: BlogPost) => void;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mt-4 grid gap-4 sm:grid-cols-2"
    >
      {posts.map((post) => (
        <motion.div
          key={post.id}
          variants={itemVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
        >
          <Card
            className="cursor-pointer blog-card eldritch-card"
            onClick={() => onSelect(post)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {post.content.slice(0, 100).replace(/[#*>\-|`]/g, "")}...
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {post.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString("zh-CN")}
                </time>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
