const W = 1080
const H = 1440

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    if (char === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed'

export async function shareQuoteCard(options: {
  text: string
  title: string
  source: string
  date?: string
}): Promise<ShareResult> {
  try {
    await document.fonts?.ready
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'failed'

    ctx.fillStyle = '#f7f4ed'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#25241f'
    ctx.font = '600 42px "Songti SC", "Noto Serif CJK SC", "SimSun", serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('白羽', 112, 132)

    ctx.fillStyle = 'rgba(60,52,38,0.18)'
    ctx.fillRect(112, 196, W - 224, 1)

    // quote mark
    ctx.fillStyle = '#3f6b4f'
    ctx.font = '500 130px "Songti SC", Georgia, serif'
    ctx.fillText('“', 100, 300)

    const quote = options.text.trim().replace(/\s+/g, ' ')
    ctx.fillStyle = '#25241f'
    ctx.font = '500 58px "Songti SC", "Noto Serif CJK SC", "SimSun", serif'
    const lines = wrapText(ctx, quote, W - 280)
    const lineHeight = 98
    const startY = 370
    lines.forEach((line, index) => {
      ctx.fillText(line, 140, startY + index * lineHeight)
    })

    const quoteBottom = startY + (lines.length - 1) * lineHeight

    // footer
    const footerY = Math.max(quoteBottom + 160, 1080)
    ctx.fillStyle = 'rgba(60,52,38,0.16)'
    ctx.fillRect(112, footerY, W - 224, 1)

    ctx.fillStyle = '#3b3a33'
    ctx.font = '400 30px "PingFang SC", "Microsoft YaHei", sans-serif'
    const titleLines = wrapText(ctx, `摘自《${options.title}》`, W - 260).slice(0, 2)
    titleLines.forEach((line, index) => {
      ctx.fillText(line, 112, footerY + 70 + index * 44)
    })

    ctx.fillStyle = 'rgba(60,52,38,0.48)'
    ctx.font = '400 24px "PingFang SC", "Microsoft YaHei", sans-serif'
    const meta = [options.source, options.date].filter(Boolean).join(' · ')
    ctx.fillText(meta, 112, footerY + 70 + titleLines.length * 44 + 16)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/png'),
    )
    if (!blob) return 'failed'

    const file = new File([blob], `白羽摘录-${Date.now()}.png`, { type: 'image/png' })
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean
      share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>
    }

    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: '白羽摘录' })
        return 'shared'
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') return 'cancelled'
      }
    }

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
