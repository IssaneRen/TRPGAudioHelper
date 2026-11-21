import { compose } from '../../composition.js';
import { demoSong, deserialize, emptyPattern, newSong, serialize } from './song.js';

function arrangement(seed, title) {
  const melody = compose(seed);
  const score = newSong();
  score.title = title;
  score.bpm = melody.bpm;
  score.speed = 6;
  score.instruments[0].duty = melody.duty;
  score.patterns = [emptyPattern(32), emptyPattern(32)];
  score.order = [0, 1];
  for (let i = 0; i < melody.notes.length; i++) {
    const row = score.patterns[Math.floor(i / 32)].cells[i % 32];
    const note = melody.notes[i];
    row[0] = [note ?? -1, 0, null, null, null];
    if (i % 2 === 0) row[1] = [melody.bass[i] + 24 + (i % 4 === 0 ? 0 : 7), 3, 7, null, null];
    row[2] = [melody.bass[i], 2, null, null, null];
    const kick = i % 4 === 0, snare = i % 4 === 2;
    row[3] = [kick ? 54 : snare ? 70 : 92, kick ? 4 : snare ? 5 : 6, null, null, null];
  }
  return score;
}

export function setupLibrary({ current, load, play }) {
  const $ = id => document.getElementById(id);
  const status = text => { $('library-status').textContent = text; };
  const storageKey = 'ai-session-token';
  const token = () => localStorage.getItem(storageKey) || '';
  const catalog = $('catalog');
  const songsPath = '/api/music/songs';
  let endpoint, session, cursor;

  async function api(path, options = {}) {
    if (!endpoint) {
      const config = await fetch('/config/runtime.json', { cache: 'no-store' });
      if (!config.ok) throw Error('站点配置暂不可用。');
      endpoint = new URL((await config.json()).aiGatewayUrl).origin;
    }
    const response = await fetch(endpoint + path, { cache: 'no-store', redirect: 'error', ...options });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw Object.assign(Error(response.status === 401 ? '凭据已失效，请重新登录。' : body.error || '曲库暂不可用。'), { status: response.status });
    }
    return response.json();
  }

  function account(user) {
    session = user;
    $('publish').disabled = !user;
    $('account').textContent = user ? '退出登录' : '登录';
    $('identity').textContent = user ? user.displayName + ' 已登录。保存到公开曲库后，所有访客都能载入和播放该版本。' :
      '访客可临时编曲，导出曲谱或 WAV。登录保存的曲目将对所有人公开。';
  }
  async function authenticate(value) {
    return api('/api/session', { method: 'POST', headers: { authorization: 'Bearer ' + value, 'content-type': 'application/json' }, body: '{}' });
  }
  async function sync() {
    const value = token();
    account(null);
    if (value) {
      try { const user = await authenticate(value); if (value === token()) account(user); }
      catch (err) { if (value === token()) status(err.message); }
    }
  }
  async function refresh(append = false) {
    $('more').disabled = true;
    try {
      const page = await api(songsPath + (append ? '?before=' + cursor : ''));
      if (!append) $('published').replaceChildren();
      for (const item of page.songs) $('published').append(new Option(item.title, String(item.id)));
      cursor = page.songs.at(-1)?.id;
      $('more').hidden = !page.more;
    } finally { $('more').disabled = false; }
  }
  $('more').onclick = () => refresh(true).catch(err => status(err.message));
  $('account').onclick = () => {
    if (session) { localStorage.removeItem(storageKey); account(null); status('已退出登录。'); }
    else { $('login-form').hidden = !$('login-form').hidden; if (!$('login-form').hidden) $('credential').focus(); }
  };
  $('login-form').onsubmit = async event => {
    event.preventDefault();
    const value = $('credential').value.trim();
    try {
      const user = await authenticate(value);
      localStorage.setItem(storageKey, value);
      account(user);
      $('credential').value = '';
      $('login-form').hidden = true;
      status('登录成功，当前曲谱已保留。');
    } catch (err) { status(err.message); }
  };
  $('publish').onclick = async () => {
    if (!session) return;
    $('publish').disabled = true;
    try {
      const saved = await api(songsPath, { method: 'POST', headers: { authorization: 'Bearer ' + token(), 'content-type': 'application/json' },
        body: JSON.stringify(serialize(current())) });
      status('已保存到公开曲库：' + saved.title);
      await refresh();
      catalog.value = String(saved.id);
    } catch (err) { if (err.status === 401) account(null); status(err.message); }
    finally { $('publish').disabled = !session; }
  };
  $('listen').onclick = async () => {
    $('listen').disabled = true;
    try {
      const id = catalog.value;
      const preset = { demo: () => demoSong(), night: () => arrangement(81, '夜行列车'), stars: () => arrangement(702, '星港漫步') };
      const score = preset[id] ? preset[id]() : deserialize(await api(songsPath + '/' + encodeURIComponent(id)));
      load(score);
      await play();
      status('已载入：' + score.title);
    } catch (err) { status(err.message); }
    finally { $('listen').disabled = false; }
  };
  $('generate').onclick = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    load(arrangement(seed, '芯片曲 ' + seed.toString(16).padStart(8, '0')));
    status('已生成主旋律、琶音、低音与鼓轨。');
  };
  window.addEventListener('storage', e => { if (e.key === storageKey || e.key === null) void sync(); });
  void sync();
  refresh().catch(() => status('暂时无法读取用户曲库，仍可播放初始曲目、编曲和导出。'));
}
