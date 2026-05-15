/**
 * Identity Modal UI Logic for Vouch SDK
 * Handles the creation and management of the verification iframe and overlay.
 */

export interface OpenModalParams {
  verifyUrl: string;
  apiKey: string;
  externalUserId: string;
  onResult: (result: any) => void;
  onError: (err: Error) => void;
  onCancel: () => void;
}

export function openIdentityModal(params: OpenModalParams) {
  // 1. Inject CSS animations
  if (!document.getElementById('vouch-sdk-styles')) {
    const style = document.createElement('style');
    style.id = 'vouch-sdk-styles';
    style.textContent = `
      @keyframes vouch-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes vouch-slide-up {
        from { transform: translateY(20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: vouch-fade-in 0.3s ease-out;
  `;

  // 3. Create iframe
  const iframe = document.createElement('iframe');
  const url = new URL(`${params.verifyUrl}/verify`);
  url.searchParams.set('userId', params.externalUserId);
  url.searchParams.set('key', params.apiKey);
  url.searchParams.set('mode', 'modal');

  iframe.src = url.toString();
  iframe.allow = "camera; microphone; display-capture";
  iframe.allowFullscreen = true;
  iframe.style.cssText = `
    width: 480px;
    max-width: 95vw;
    height: 700px;
    max-height: 95vh;
    border: none;
    border-radius: 24px;
    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
    background: #0a0a0a;
    animation: vouch-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // 4. Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';

  // 5. Cleanup function
  const close = () => {
    window.removeEventListener('message', messageHandler);
    window.removeEventListener('keydown', escHandler);
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 200);
  };

  const cancel = () => {
    close();
    params.onCancel();
  };

  // 6. Event Listeners
  closeBtn.onclick = cancel;
  overlay.onclick = (e) => {
    if (e.target === overlay) cancel();
  };

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cancel();
  };
  window.addEventListener('keydown', escHandler);

  const messageHandler = (event: MessageEvent) => {
    // Basic origin check (can be hardened later)
    if (event.data?.source !== 'vouch-identity') return;

    close();
    if (event.data.success) {
      params.onResult(event.data.result);
    } else {
      params.onError(new Error(event.data.error || 'Verification failed'));
    }
  };
  window.addEventListener('message', messageHandler);

  // 7. Mount
  overlay.appendChild(iframe);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
}
