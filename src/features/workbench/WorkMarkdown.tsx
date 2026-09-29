import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function isVideoUrl(href: string | undefined): href is string {
  return Boolean(href && /^(https?:\/\/|\/content-assets\/)/i.test(href) && /\.(mp4|webm|ogv)(?:[?#]|$)/i.test(href));
}

export function WorkMarkdown({ body }: { body: string }) {
  return <Markdown remarkPlugins={[remarkGfm]} components={{
    a: ({ href, children }) => isVideoUrl(href)
      ? <video controls preload="metadata" src={href} aria-label={typeof children === "string" ? children : "作品视频"} />
      : <a href={href}>{children}</a>
  }}>{body}</Markdown>;
}
