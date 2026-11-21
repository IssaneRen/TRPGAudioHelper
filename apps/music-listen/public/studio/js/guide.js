import { demoSong, serialize } from './song.js';
import { renderSong } from './synth.js';
import { encodeWav } from './wav.js';

export function setupGuide({ stopEditor, download }) {
  const dialog = document.querySelector('#guide');
  const status = dialog.querySelector('#guide-status');
  const tone = dialog.querySelector('#guide-tone');
  const note = dialog.querySelector('#guide-note');
  const rate = 22050;
  let context, source, revision = 0;

  function practice() {
    const score = demoSong();
    const phrase = score.patterns[0];
    score.title = '第一次编曲';
    score.patterns = [phrase];
    score.order = [0];
    for (const row of phrase.cells) {
      if (row[0][1] === 0) row[0][1] = Number(tone.value);
    }
    phrase.cells[0][0][0] = Number(note.value);
    return score;
  }
  function stop() {
    revision++;
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
      source = null;
    }
  }
  dialog.querySelectorAll('[data-guide-channel]').forEach(button => {
    button.onclick = async () => {
      stop();
      const pending = revision;
      try {
        context ??= new AudioContext();
        await context.resume();
        if (revision !== pending || !dialog.open) return;
        const ch = button.dataset.guideChannel;
        const mute = [0, 1, 2, 3].map(i => ch !== 'all' && i !== Number(ch));
        const pcm = renderSong(practice(), rate, { mute });
        const buffer = context.createBuffer(1, pcm.length, rate);
        buffer.copyToChannel(pcm, 0);
        source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.onended = () => { source.disconnect(); source = null; status.textContent = '试听结束'; };
        source.start();
        status.textContent = '正在播放：' + button.textContent;
      } catch { status.textContent = '音频没有启动，请再点一次试听。'; }
    };
  });
  dialog.querySelector('#guide-score').onclick = async () => {
    try {
      const blob = new Blob([JSON.stringify(serialize(practice()))]);
      const bytes = await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
      download(bytes, '第一次编曲.json.gz', 'application/gzip');
      status.textContent = '练习曲谱已导出，可在工作台点「导入曲谱」打开。';
    } catch { status.textContent = '当前浏览器无法导出压缩曲谱。'; }
  };
  dialog.querySelector('#guide-wav').onclick = () => {
    download(encodeWav(renderSong(practice(), rate), rate), '第一次编曲.wav', 'audio/wav');
    status.textContent = '练习音频已导出。';
  };
  document.querySelector('#guide-open').onclick = () => {
    stopEditor();
    status.textContent = '';
    dialog.showModal();
  };
  dialog.querySelector('#guide-close').onclick = () => dialog.close();
  dialog.addEventListener('close', stop);
  window.addEventListener('pagehide', stop);
}
