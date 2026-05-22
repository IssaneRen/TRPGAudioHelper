import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlogPostMeta {
  id: string;
  title: string;
  file: string;
  category: "blog" | "misc";
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

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

let indexCache: BlogPostMeta[] | null = null;
const contentCache = new Map<string, string>();

export default function BlogTab() {
  const [posts, setPosts] = useState<BlogPostMeta[]>(indexCache || []);
  const [loading, setLoading] = useState(!indexCache);
  const [selectedPost, setSelectedPost] = useState<BlogPostMeta | null>(null);
  const [postContent, setPostContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    if (indexCache) return;
    fetch("/blog/index.json")
      .then((r) => r.json())
      .then((data: BlogPostMeta[]) => {
        indexCache = data;
        setPosts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPost = async (post: BlogPostMeta) => {
    setSelectedPost(post);

    const cached = contentCache.get(post.file);
    if (cached) {
      setPostContent(cached);
      return;
    }

    setContentLoading(true);
    try {
      const res = await fetch(`/blog/${post.file}`);
      const text = await res.text();
      contentCache.set(post.file, text);
      setPostContent(text);
    } finally {
      setContentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <button
          onClick={() => { setSelectedPost(null); setPostContent(""); }}
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
          {contentLoading ? (
            <div className="space-y-2 mt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <Markdown remarkPlugins={[remarkGfm]}>{postContent}</Markdown>
          )}
        </article>
      </motion.div>
    );
  }

  const blogPosts = posts.filter((p) => p.category === "blog");
  const miscPosts = posts.filter((p) => p.category === "misc");

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
          <PostList posts={blogPosts} onSelect={handleSelectPost} />
        </TabsContent>
        <TabsContent value="misc">
          <PostList posts={miscPosts} onSelect={handleSelectPost} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function PostList({
  posts,
  onSelect,
}: {
  posts: BlogPostMeta[];
  onSelect: (post: BlogPostMeta) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        暂无文章
      </div>
    );
  }

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
