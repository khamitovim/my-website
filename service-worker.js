<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>ANTIHIT Shuffle</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --orb-size: min(81vw, 342px); 
      --glow-color: #6633ff;
      --glow-size: 50px;
    }
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #000;
      color: #fff;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .player-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 25px;
      width: 100%;
      padding: 20px;
      user-select: none;
    }
    .player-header {
      width: 100%;
      text-align: center;
      opacity: 0.8;
    }
    .player-header h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .orb-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .orb {
      position: relative;
      width: var(--orb-size);
      height: var(--orb-size);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 var(--glow-size) 0px var(--glow-color);
      transition: box-shadow 0.2s linear;
      border-radius: 50%;
      touch-action: none;
    }
    .orb__background {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), rgba(255,255,255,0) 70%), #111;
      animation: spin 20s linear infinite;
      animation-play-state: paused;
    }
    .orb.is-playing .orb__background {
      animation-play-state: running;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .orb__hint {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      opacity: 0;
      animation: pulse 4s infinite ease-in-out;
    }
    .orb__hint .arrow {
      font-size: 14px;
      position: relative;
      top: 1px;
    }
    .hint--up { top: 20%; }
    .hint--down { bottom: 20%; }

    @keyframes pulse {
      0%, 100% { opacity: 0.1; }
      50% { opacity: 0.5; }
    }

    .play-button {
      position: relative;
      z-index: 2;
      width: 30%; height: 30%;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: transform 0.2s;
    }
    .play-button:hover { transform: scale(1.1); }
    .play-button svg { fill: #fff; width: 40%; height: 40%; }
    .play-button .icon-pause { display: none; }
    .play-button.is-playing .icon-play { display: none; }
    .play-button.is-playing .icon-pause { display: block; }
    .services-header {
      text-align: center;
    }
    .services-header p {
      margin: 0 0 10px 0;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .services {
      display: flex;
      flex-wrap: nowrap;
      gap: 25px;
      align-items: center;
      justify-content: center;
    }
    .services a {
      display: inline-flex;
      flex-shrink: 0;
      width: 64px; height: 64px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
    }
    .services a:hover {
      transform: translateY(-5px);
      background: rgba(255, 255, 255, 0.1);
    }
    .services img {
      max-width: 36px;
      max-height: 36px;
    }
  </style>

</head>
<body>
  
  <div class="player-container">
    
    <header class="player-header">
      <h1>ANTIHIT Shuffle</h1>
    </header>

    <div class="orb-container">
      <div id="orb" class="orb">
        <div class="orb__background"></div>
        <canvas id="visualizer-canvas" class="visualizer-canvas" style="display: none;"></canvas>
        <button id="play-button" class="play-button" aria-label="Play/Pause">
          <svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          <svg class="icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
        </button>
        
        <div class="orb__hint hint--up">
          next <span class="arrow">›</span>
        </div>
        <div class="orb__hint hint--down">
          <span class="arrow">‹</span> back
        </div>

      </div>
    </div>
    
    <div class="services-header">
        <p>Full versions here</p>
    </div>
    <nav id="services" class="services" hidden></nav>

  </div>

  <script>
    (() => {
      'use strict';

      const SETTINGS = {
        API_URL: '/api/tracks.php',
        CLIP_DURATION: 25,
      };

      const state = {
        audioContext: null,
        analyser: null,
        audioElement: new Audio(),
        tracks: [],
        history: [],
        currentTrack: null,
        isPlaying: false,
        animationFrameId: null,
        hasInteracted: false,
      };

      const dom = {
        container: document.querySelector('.player-container'),
        orb: document.getElementById('orb'),
        playButton: document.getElementById('play-button'),
        services: document.getElementById('services'),
      };

      const init = async () => {
        setupEventListeners();
        try {
          state.tracks = await fetchTracks();
          if (!state.tracks || state.tracks.length === 0) throw new Error('Треки не найдены');
          await prepareNextTrack();
        } catch (error) {
          console.error(error.message);
        }
      };
      
      const lerp = (a, b, t) => a + (b - a) * t;

      const ui = {
        setPlaying(playing) {
          state.isPlaying = playing;
          dom.playButton.classList.toggle('is-playing', playing);
          dom.orb.classList.toggle('is-playing', playing);
        },
        updateServices(track) {
          dom.services.innerHTML = '';
          dom.services.hidden = true;
          if (!track.links) return;
          const servicesToShow = ['spotify', 'apple', 'youtube', 'amazon'];
          let hasLinks = false;
          const serviceNameMap = { apple: 'applemusic', youtube: 'ytmusic' };
          servicesToShow.forEach(service => {
            if (track.links[service]) {
              const serviceName = serviceNameMap[service] || service;
              const link = document.createElement('a');
              link.href = track.links[service];
              link.target = '_blank';
              link.rel = 'noopener';
              link.innerHTML = `<img src="/assets/icons/brand-${serviceName}.svg" alt="${service}">`;
              dom.services.appendChild(link);
              hasLinks = true;
            }
          });
          dom.services.hidden = !hasLinks;
        },
        updateGlow() {
          if (!state.analyser) return;

          const bufferLength = state.analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          state.analyser.getByteFrequencyData(dataArray);

          const bass = dataArray.slice(0, bufferLength / 4).reduce((s, v) => s + v, 0) / (bufferLength / 4);
          const treble = dataArray.slice(bufferLength / 2).reduce((s, v) => s + v, 0) / (bufferLength / 2);
          const overall = (bass + treble) / 2;

          const baseGlowSize = 50;
          const maxGlowSize = 90;
          const glowSize = baseGlowSize + (overall / 255) * (maxGlowSize - baseGlowSize);
          dom.orb.style.setProperty('--glow-size', `${glowSize}px`);

          const bassColor = [102, 51, 255];
          const trebleColor = [51, 255, 204];
          const colorRatio = Math.min(1, bass / 150);
          const r = lerp(trebleColor[0], bassColor[0], colorRatio);
          const g = lerp(trebleColor[1], bassColor[1], colorRatio);
          const b = lerp(trebleColor[2], bassColor[2], colorRatio);
          dom.orb.style.setProperty('--glow-color', `rgb(${r},${g},${b})`);
        }
      };

      const setupAudioContext = async () => {
        if (state.audioContext) return;
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          state.audioContext = new AudioContext();
          const source = state.audioContext.createMediaElementSource(state.audioElement);
          state.analyser = state.audioContext.createAnalyser();
          state.analyser.fftSize = 256;
          state.analyser.smoothingTimeConstant = 0.8;
          source.connect(state.analyser).connect(state.audioContext.destination);
        } catch (e) { console.error('Ошибка создания AudioContext:', e); }
      };

      const play = async () => {
        if (!state.currentTrack || state.isPlaying) return;
        if (!state.audioContext) await setupAudioContext();
        if (state.audioContext.state === 'suspended') await state.audioContext.resume();
        try {
          await state.audioElement.play();
          ui.setPlaying(true);
          animate();
        } catch (e) {
          console.error('Ошибка воспроизведения:', e);
          ui.setPlaying(false);
        }
      };

      const pause = () => {
        state.audioElement.pause();
        ui.setPlaying(false);
        cancelAnimationFrame(state.animationFrameId);
        dom.orb.style.setProperty('--glow-size', `50px`);
      };

      const loadTrack = async (trackData) => {
        state.currentTrack = { clipDuration: SETTINGS.CLIP_DURATION, ...trackData, links: {} };
        state.audioElement.src = trackData.ogg || trackData.mp3;

        if (trackData.meta) {
            try {
                const response = await fetch(trackData.meta);
                const meta = await response.json();
                const s = meta.streaming || meta;
                state.currentTrack.links = {
                    spotify: s.spotify, apple: s.apple || s.apple_music,
                    youtube: s.youtube || s.youtube_music, amazon: s.amazon || s.amazon_music
                };
            } catch (e) { console.warn('Не удалось загрузить мета-данные'); }
        }
        ui.updateServices(state.currentTrack);
      };
      
      const prepareNextTrack = async () => {
        pause();
        if(state.currentTrack) {
            state.history.push(state.currentTrack);
        }
        const nextTrackData = state.tracks[Math.floor(Math.random() * state.tracks.length)];
        await loadTrack(nextTrackData);
      };
      
      const playPreviousTrack = async () => {
        if (state.history.length === 0) return;
        pause();
        const previousTrackData = state.history.pop();
        await loadTrack(previousTrackData); 
        await play();
      };

      const animate = () => {
        ui.updateGlow();
        state.animationFrameId = requestAnimationFrame(animate);
      };

      const setupEventListeners = () => {
        dom.playButton.addEventListener('click', () => {
          state.isPlaying ? pause() : play();
        });

        state.audioElement.addEventListener('timeupdate', () => {
          if (state.audioElement.currentTime >= (state.currentTrack?.clipDuration || SETTINGS.CLIP_DURATION)) {
            prepareNextTrack().then(play);
          }
        });

        let isDragging = false;
        let startAngle = 0;
        let lastAngle = 0;
        let accumulatedAngle = 0;

        const getAngle = (e) => {
          const rect = dom.orb.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          return Math.atan2(clientY - centerY, clientX - centerX);
        };

        const onPointerDown = (e) => {
          isDragging = true;
          startAngle = lastAngle = getAngle(e);
          accumulatedAngle = 0;
          dom.orb.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e) => {
          if (!isDragging) return;
          const currentAngle = getAngle(e);
          let delta = currentAngle - lastAngle;
          if (delta > Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          accumulatedAngle += delta;
          lastAngle = currentAngle;
        };

        const onPointerUp = (e) => {
          if (!isDragging) return;
          isDragging = false;
          dom.orb.releasePointerCapture(e.pointerId);

          const threshold = Math.PI / 4; 

          if (Math.abs(accumulatedAngle) > threshold) {
            if (accumulatedAngle > 0) { // По часовой -> Следующий
              prepareNextTrack().then(play);
            } else { // Против часовой -> Предыдущий
              playPreviousTrack();
            }
          }
        };

        dom.orb.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);

        window.addEventListener('pageshow', (event) => {
          if (event.persisted && state.isPlaying) {
            animate();
          }
        });
      };

      const fetchTracks = async () => {
        const response = await fetch(SETTINGS.API_URL);
        if (!response.ok) throw new Error('Ошибка сети при загрузке треков');
        const data = await response.json();
        return data.tracks;
      };

      init();

    })();
  </script>

</body>
</html>