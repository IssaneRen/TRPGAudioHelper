import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "#7f1d1d",
  "#92400e",
  "#365314",
  "#065f46",
  "#164e63",
  "#1d4ed8",
  "#3730a3",
  "#6d28d9",
  "#9d174d",
  "#3f3f46",
];

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function firstReadableChar(value: string): string {
  return Array.from(value.trim()).find((char) => char.trim().length > 0) || "?";
}

export function getStableAvatarColor(seed: string): string {
  return AVATAR_COLORS[hashString(seed || "avatar") % AVATAR_COLORS.length];
}

export function StableAvatar({
  src,
  name,
  size = 48,
  className,
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={`${name}头像`}
        loading="lazy"
        className={cn("shrink-0 rounded-full border border-border/70 object-cover object-top", className)}
        style={dimension}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-white shadow-inner",
        className
      )}
      style={{ ...dimension, backgroundColor: getStableAvatarColor(name) }}
      aria-label={`${name}头像`}
      title={name}
    >
      {firstReadableChar(name)}
    </div>
  );
}
