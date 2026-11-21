import { works } from './works.js'

const art = document.querySelector('#art')
const message = document.querySelector('#message')
const thumbnails = document.querySelector('.thumbnails')
let selected = -1

const links = works.map((work) => {
  const link = document.createElement('a')
  link.href = `#${work.id}`
  const thumbnail = new Image(360, 240)
  thumbnail.loading = 'lazy'
  thumbnail.decoding = 'async'
  thumbnail.alt = ''
  thumbnail.src = work.thumb
  const label = document.createElement('span')
  label.textContent = work.title
  link.append(thumbnail, label)
  thumbnails.append(link)
  return link
})

function syncWork() {
  const id = location.hash.slice(1)
  const index = Math.max(0, works.findIndex((work) => work.id === id))
  const work = works[index]
  if (!work) {
    message.textContent = '暂无作品。'
    return
  }
  if (index === selected) return

  links[selected]?.removeAttribute('aria-current')
  selected = index
  links[index].setAttribute('aria-current', 'true')
  message.textContent = ''
  art.hidden = true
  art.alt = work.alt ?? work.title
  art.src = work.image
}

art.addEventListener('load', () => { art.hidden = false })
art.addEventListener('error', () => {
  message.textContent = '这幅图片暂时无法加载。'
})

window.addEventListener('hashchange', syncWork)
document.addEventListener('keydown', (event) => {
  if (works.length < 2) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const offset = event.key === 'ArrowLeft' ? -1 : 1
  const index = (selected + offset + works.length) % works.length
  location.hash = works[index].id
})

syncWork()
