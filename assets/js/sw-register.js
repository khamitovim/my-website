/* Регистрация Service Worker для офлайн-оболочки и обновлений */
(() => {
  if (!('serviceWorker' in navigator)) return;

  const SW_URL = '/service-worker.js';

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
      console.log('[SW] registered', reg);

      // Отслеживаем новые версии SW, чтобы предлагать обновление
      if (reg.waiting) promptUpdate(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Новая версия готова, предложим перезагрузку
            promptUpdate(newWorker);
          }
        });
      });

      // Слушаем сообщения от SW (например, SKIP_WAITING подтверждение)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data === 'reload-window') {
          window.location.reload();
        }
      });
    } catch (e) {
      console.warn('[SW] registration failed', e);
    }
  });

  function promptUpdate(worker) {
    // Лёгкий inline-тост без зависимостей
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
      background: rgba(20,20,28,.9); color: #fff; padding: 10px 14px; border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0,0,0,.35); font: 500 14px/1.2 system-ui; z-index: 9999;
    `;
    toast.textContent = 'Доступно обновление · Обновить сейчас?';

    const btn = document.createElement('button');
    btn.textContent = 'Обновить';
    btn.style.cssText = 'margin-left:10px;background:#6cf0ff;border:0;border-radius:10px;padding:6px 10px;cursor:pointer';

    btn.onclick = () => {
      worker.postMessage({ type: 'SKIP_WAITING' });
      // Перезагрузку пошлёт сам SW сообщением 'reload-window'
      document.body.removeChild(toast);
    };

    toast.appendChild(btn);
    document.body.appendChild(toast);
  }
})();
