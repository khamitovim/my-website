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
    audioUnlocked: false, // <-- НОВЫЙ ФЛАГ для отслеживания активации аудио
  };

  const dom = {
    container: document.querySelector('.player-container'),
    orb: document.getElementById('orb'),
    playButton: document.getElementById('play-button'),
    services: document.getElementById('services'),
    servicesPopover: document.getElementById('services-popover'),
    openServicesBtn: document.getElementById('open-services-btn'),
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
      dom.servicesPopover.classList.remove('visible');
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
      if (hasLinks) {
        dom.servicesPopover.classList.add('visible');
        dom.servicesPopover.classList.remove('is-open');
      }
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
      const bassColor = [102, 51, 255];
      const trebleColor = [51, 255, 204];
      const colorRatio = Math.min(1, bass / 150);
      const r = lerp(trebleColor[0], bassColor[0], colorRatio);
      const g = lerp(trebleColor[1], bassColor[1], colorRatio);
      const b = lerp(trebleColor[2], bassColor[2], colorRatio);
      
      const glowColorString = `rgb(${r},${g},${b})`;
      dom.orb.style.setProperty('--glow-size', `${glowSize}px`);
      dom.orb.style.setProperty('--glow-color', glowColorString);
      dom.openServicesBtn.style.setProperty('--glow-size', `${glowSize / 2}px`);
      dom.openServicesBtn.style.setProperty('--glow-color', glowColorString);
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
      console.log('AudioContext initialized.');
    } catch (e) { console.error('Ошибка создания AudioContext:', e); }
  };

  const play = async () => {
    if (!state.currentTrack || state.isPlaying) return;
    // Безопасная проверка и возобновление аудиоконтекста
    if (state.audioContext && state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }
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
    // Preload the audio for faster start
    state.audioElement.src = trackData.ogg || trackData.mp3;
    state.audioElement.preload = 'auto';
    try { state.audioElement.load(); } catch (e) {}
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
  
  // <-- ИЗМЕНЕНО: Более надежная логика активации аудио
  const unlockAudio = async () => {
    if (state.audioUnlocked) return;
    await setupAudioContext();
    state.audioUnlocked = true;
  };

  const setupEventListeners = () => {
    dom.playButton.addEventListener('click', () => { 
        unlockAudio(); // Активируем аудио при первом клике
        if (state.audioElement.paused) {
          play();
        } else {
          pause();
        }
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
      // Do not initiate rotation if user clicks on the play button or its children
      const target = e.target;
      if (target === dom.playButton || (dom.playButton && dom.playButton.contains(target))) {
        return;
      }
      unlockAudio(); // Активируем аудио при первом свайпе
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
        if (accumulatedAngle > 0) {
          prepareNextTrack().then(play);
        } else { 
          playPreviousTrack();
        }
      }
    };

    dom.orb.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    
    dom.openServicesBtn.addEventListener('click', (e) => {
        unlockAudio(); // Активируем аудио при клике на эту кнопку тоже
        e.stopPropagation();
        dom.servicesPopover.classList.add('is-open');
    });
    document.addEventListener('click', (e) => {
        if (dom.servicesPopover.classList.contains('is-open') && !dom.servicesPopover.contains(e.target)) {
             dom.servicesPopover.classList.remove('is-open');
        }
    });

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