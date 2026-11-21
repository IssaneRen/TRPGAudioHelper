import { works } from './works.js'

const art = document.querySelector('#art')
const message = document.querySelector('#message')
const title = document.querySelector('#title')
const counter = document.querySelector('#counter')
const previous = document.querySelector('#previous')
const next = document.querySelector('#next')
const thumbnails = document.querySelector('.thumbnails')
const number = (value) => String(value).padStart(2, '0')
let selected = -1

previous.disabled = next.disabled = works.length < 2

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
    message.hidden = false
    return
  }
  if (index === selected) return

  links[selected]?.removeAttribute('aria-current')
  selected = index
  links[index].setAttribute('aria-current', 'true')
  title.textContent = work.title
  counter.textContent = `${number(index + 1)} / ${number(works.length)}`

  message.textContent = '正在加载图片…'
  message.hidden = false
  art.hidden = true
  art.alt = work.alt ?? work.title
  art.src = work.image
}

art.addEventListener('load', () => {
  message.hidden = true
  art.hidden = false
})
art.addEventListener('error', () => {
  message.textContent = '这幅图片暂时无法加载。'
})

function step(offset) {
  if (works.length < 2) return
  const index = (selected + offset + works.length) % works.length
  location.hash = works[index].id
  syncWork()
}

previous.addEventListener('click', () => step(-1))
next.addEventListener('click', () => step(1))
window.addEventListener('hashchange', syncWork)
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  step(event.key === 'ArrowLeft' ? -1 : 1)
})

syncWork()
