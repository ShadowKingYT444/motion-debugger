let mode = 'live', size = 'desktop';
const frames = [...document.querySelectorAll('iframe')];
const videos = [...document.querySelectorAll('video')];
const stages = [...document.querySelectorAll('.stage')];
const play = document.getElementById('play');
const seek = document.getElementById('seek');
const time = document.getElementById('time');
const note = document.getElementById('note');

function fit() {
  const w = size === 'desktop' ? 1440 : 390, h = size === 'desktop' ? 1300 : 844;
  stages.forEach((stage, i) => {
    const available = stage.clientWidth;
    const scale = Math.min(available / w, size === 'mobile' ? 1 : 10);
    stage.style.height = h * scale + 'px';
    Object.assign(frames[i].style, {
      width: w + 'px', height: h + 'px', transform: `scale(${scale})`,
      left: size === 'mobile' ? (available - w * scale) / 2 + 'px' : '0',
    });
  });
}

function updateTransport() {
  const ready = videos.every(video => Number.isFinite(video.duration) && video.readyState >= 1 && !video.error);
  play.disabled = seek.disabled = !ready;
  seek.max = ready ? Math.max(...videos.map(video => video.duration)) : 0;
  seek.value = Math.max(...videos.map(video => video.currentTime));
  time.value = Number(seek.value).toFixed(1) + 's';
  play.textContent = videos.some(video => !video.paused && !video.ended) ? 'Pause both' : 'Play both';
  if (mode === 'film' && videos.some(video => video.error))
    note.textContent = 'Recording unavailable. Try Live apps or regenerate the native films with the browser verification.';
}

function pauseBoth() { videos.forEach(video => video.pause()); updateTransport(); }

async function playBoth() {
  const results = await Promise.allSettled(videos.map(video => video.play()));
  if (results.some(result => result.status === 'rejected')) {
    pauseBoth();
    note.textContent = 'Playback could not start. Check that both recordings are available, then try Play both.';
  }
  updateTransport();
}

function render() {
  pauseBoth();
  for (const id of ['live', 'film', 'desktop', 'mobile'])
    document.getElementById(id).setAttribute('aria-pressed', String(id === mode || id === size));
  stages.forEach(stage => stage.classList.toggle('hidden', mode !== 'live'));
  document.getElementById('transport').classList.toggle('hidden', mode !== 'film');
  videos.forEach((video, i) => {
    video.classList.toggle('hidden', mode !== 'film');
    const src = `evidence/${i ? 'motion' : 'ordinary'}-${size}/journey.webm`;
    if (video.getAttribute('src') !== src) video.src = src;
  });
  note.textContent = mode === 'film'
    ? 'Play, pause or seek both recordings together. Original timing is preserved; app clocks and action times can differ.' : '';
  fit();
  updateTransport();
}

for (const id of ['live', 'film']) document.getElementById(id).onclick = () => { mode = id; render(); };
for (const id of ['desktop', 'mobile']) document.getElementById(id).onclick = () => { size = id; render(); };
document.getElementById('restart').onclick = () => {
  if (mode === 'film') {
    if (play.disabled) return;
    videos.forEach(video => { video.currentTime = 0; });
    void playBoth();
  } else frames.forEach(frame => { frame.src = frame.src; });
};
play.onclick = () => videos.some(video => !video.paused && !video.ended) ? pauseBoth() : void playBoth();
seek.oninput = () => {
  const requested = Number(seek.value);
  pauseBoth();
  videos.forEach(video => { video.currentTime = Math.min(requested, video.duration); });
  updateTransport();
};
videos.forEach(video => {
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'emptied'])
    video.addEventListener(event, updateTransport);
  video.onerror = () => {
    pauseBoth();
    play.disabled = seek.disabled = true;
    note.textContent = 'Recording unavailable. Try Live apps or regenerate the native films with the browser verification.';
  };
});
window.addEventListener('resize', fit);
render();
