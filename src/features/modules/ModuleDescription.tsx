interface ModuleDescriptionProps {
  description: string;
}

export function ModuleDescription({ description }: ModuleDescriptionProps) {
  const paragraphs = description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          className="whitespace-pre-line leading-8 text-foreground/95"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
