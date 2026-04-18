import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ProfileData } from "@/types";

interface ProfileEditorProps {
  profile: ProfileData;
  onSave: (data: Partial<ProfileData>) => void;
  onCancel: () => void;
}

export function ProfileEditor({ profile, onSave, onCancel }: ProfileEditorProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [disclaimer, setDisclaimer] = useState(profile.disclaimer);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">昵称</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">个人简介</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="disclaimer">免责声明与跑团要求</Label>
        <Textarea
          id="disclaimer"
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          rows={4}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave({ name, bio, disclaimer })}>保存</Button>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}
