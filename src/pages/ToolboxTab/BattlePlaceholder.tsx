import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function BattlePlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[50vh]"
    >
      <Card className="max-w-md w-full eldritch-card">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
            <Swords className="h-8 w-8 text-primary/60" />
          </div>
          <h2 className="text-2xl font-bold">模拟战斗</h2>
          <p className="text-muted-foreground">
            敬请期待
          </p>
          <p className="text-sm text-muted-foreground/60">
            该功能正在开发中，将支持 TRPG 战斗模拟与回合管理。
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
