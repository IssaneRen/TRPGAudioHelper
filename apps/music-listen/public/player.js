const rate = 22050;
const steps = 64;
const play = document.querySelector('#play');
const next = document.querySelector('#next');
const canvas = document.querySelector('canvas');
const pen = canvas.getContext('2d');
let context, source, buffer, song, started, frame;
let offset = 0;

function randomFrom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function compose(seed) {
  const random = randomFrom(seed);
  const pick = items => items[Math.floor(random() * items.length)];
  const root = 57 + Math.floor(random() * 8);
  const bpm = 126 + Math.floor(random() * 40);
  const motif = Array.from({length: 8}, () => pick([0, 0, 3, 5, 7, 10, 12]));
  const progression = pick([[0, -5, -2, 0], [0, 3, -5, -2], [0, -2, -5, 0]]);
  const notes = [], bass = [];
  for (let step = 0; step < steps; step++) {
    const chord = root + progression[Math.floor(step / 16)];
    const ending = step % 16 >= 12;
    notes.push(step % 4 === 3 && random() < .28 ? null :
      chord + motif[step % 8] + (ending && step % 2 === 0 ? 12 : 0));
    bass.push(chord - 24 + (step % 4 === 2 ? 7 : 0));
  }
  return {seed, bpm, notes, bass, duty: pick([.125, .25, .5])};
}

// Render one short loop once. AudioBufferSourceNode repeats it on the audio thread.
function render(song) {
  const stepTime = 30 / song.bpm;
  const result = context.createBuffer(1, Math.round(rate * steps * stepTime), rate);
  const data = result.getChannelData(0);
  const noise = randomFrom(song.seed);
  const hz = note => 440 * 2 ** ((note - 69) / 12);
  for (let s = 0; s < steps; s++) {
    const start = Math.round(s * stepTime * rate);
    const end = Math.round((s + 1) * stepTime * rate);
    const leadHz = hz(song.notes[s] ?? 69);
    const bassHz = hz(song.bass[s]);
    for (let i = start; i < end; i++) {
      const t = (i - start) / rate;
      const attack = Math.min(1, t / .003);
      const gate = attack * Math.max(0, 1 - (t / stepTime) ** 3);
      const pulse = (t * leadHz) % 1 < song.duty ? 1 - song.duty : -song.duty;
      const lead = song.notes[s] === null ? 0 : pulse * .38;
      const bass = (1 - 4 * Math.abs((t * bassHz) % 1 - .5)) * .19;
      const snare = s % 4 === 2;
      const drum = (noise() * 2 - 1) * Math.exp(-t * (snare ? 30 : 95)) * (snare ? .21 : .09);
      const kick = s % 4 === 0 ? .22 * Math.sin(2 * Math.PI * (48 * t + .95 * (1 - Math.exp(-65 * t)))) * Math.exp(-t * 32) : 0;
      data[i] = gate * (lead + bass + drum + kick);
    }
  }
  return result;
}

function draw() {
  const {width, height} = canvas;
  pen.clearRect(0, 0, width, height);
  const unit = width / steps;
  const beat = source ? Math.floor(((context.currentTime - started) % buffer.duration) / buffer.duration * steps) : -1;
  song.notes.forEach((note, i) => {
    pen.fillStyle = i === beat ? '#ffe598' : '#95d5ac';
    if (note !== null) pen.fillRect(i * unit, height - 12 - (note - 50) * 3.5, unit - 2, 6);
    if (i === beat) pen.fillRect(i * unit, height - 4, unit, 3);
  });
  if (source) frame = requestAnimationFrame(draw);
}

function pause() {
  if (!source) return;
  offset = (context.currentTime - started) % buffer.duration;
  source.stop();
  source.disconnect();
  source = null;
  cancelAnimationFrame(frame);
  play.textContent = '播放';
  draw();
}

async function start() {
  play.disabled = next.disabled = true;
  try {
    context ??= new AudioContext();
    await context.resume();
    buffer ??= render(song);
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(context.destination);
    started = context.currentTime - offset;
    source.start(0, offset);
    play.textContent = '暂停';
    document.querySelector('#status').textContent = '';
    draw();
  } catch {
    source = null;
    document.querySelector('#status').textContent = '音频未能启动，请再点一次播放，或使用支持网页音频的浏览器。';
  } finally {
    play.disabled = next.disabled = false;
  }
}

function select(id) {
  pause();
  offset = 0;
  buffer = null;
  song = compose(parseInt(id, 16));
  history.replaceState(null, '', '#'+id);
  document.querySelector('#track').textContent = '曲目 ' + id.toUpperCase();
  document.querySelector('#tempo').textContent = song.bpm + ' BPM';
  draw();
}

function freshId() {
  return crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
}
function fromLink() {
  const id = location.hash.slice(1);
  select(/^[a-f0-9]{8}$/i.test(id) ? id.toLowerCase() : freshId());
}
play.onclick = () => source ? pause() : start();
next.onclick = () => { select(freshId()); start(); };
window.addEventListener('hashchange', fromLink);
window.addEventListener('pagehide', pause);
fromLink();
