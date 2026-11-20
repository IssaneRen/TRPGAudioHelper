import type { AppData } from '@/types'

/**
 * 阅读·书 不内置任何演示内容，首次打开是空书架。
 *
 * 历史说明：旧版本曾在 xinzhi.web.v1 存储键下种入演示文章、订阅与批注，
 * 该键已废弃——store 的持久化键改为 xinzhi.web.v2，旧数据自动作废，
 * index.html 的主题预读脚本会顺带清理旧键。
 */
export function createSeedData(): AppData {
  return {
    articles: [],
    highlights: [],
    feeds: [],
    settings: {
      appearance: 'paper',
      reader: {
        font: 'serif',
        fontSize: 19,
        lineHeight: 1.95,
        measure: 'medium',
      },
    },
  }
}
