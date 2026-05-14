'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onComplete: (selfieFile: File) => void
  onBack: () => void
}

type Phase = 'intro' | 'loading' | 'detecting' | 'blink_prompt' | 'blink_done' | 'captured'

export default function LivenessCapture({ onComplete, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [error, setError] = useState<string | null>(null)
  const [blinkCount, setBlinkCount] = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const faceApiRef = useRef<any>(null)
  const lastEarRef = useRef<number>(1)
  const blinkCooldownRef = useRef(false)
  const blinkCountRef = useRef(0)

  const EAR_THRESHOLD = 0.22
  const BLINKS_REQUIRED = 2

  const loadFaceApi = useCallback(async () => {
    if (typeof window === 'undefined') return
    setPhase('loading')

    try {
      // Dynamically load face-api.js
      if (!(window as any).faceapi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/face-api.js/dist/face-api.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load face-api.js'))
          document.head.appendChild(script)
        })
      }
      faceApiRef.current = (window as any).faceapi

      // Load models from CDN
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      const faceapi = faceApiRef.current
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ])

      await startCamera()
    } catch (err: any) {
      setError('Could not load face detection. Please ensure you have a stable connection.')
      setPhase('intro')
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('detecting')
      startDetectionLoop()
    } catch {
      setError('Camera access was denied. Please allow camera access and try again.')
      setPhase('intro')
    }
  }, [])

  const computeEAR = (landmarks: any, eyeIndices: number[]) => {
    const pts = eyeIndices.map((i: number) => landmarks.positions[i])
    const A = Math.hypot(pts[1].x - pts[5].x, pts[1].y - pts[5].y)
    const B = Math.hypot(pts[2].x - pts[4].x, pts[2].y - pts[4].y)
    const C = Math.hypot(pts[0].x - pts[3].x, pts[0].y - pts[3].y)
    return (A + B) / (2.0 * C)
  }

  const startDetectionLoop = useCallback(() => {
    const faceapi = faceApiRef.current
    if (!faceapi || !videoRef.current || !overlayCanvasRef.current) return

    const video = videoRef.current
    const canvas = overlayCanvasRef.current

    const detect = async () => {
      if (!video || video.paused || video.ended) return

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)

      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      if (detection) {
        setFaceDetected(true)
        setPhase(prev => prev === 'detecting' ? 'blink_prompt' : prev)

        // LEFT eye: 36-41, RIGHT eye: 42-47
        const leftEAR = computeEAR(detection.landmarks, [36, 37, 38, 39, 40, 41])
        const rightEAR = computeEAR(detection.landmarks, [42, 43, 44, 45, 46, 47])
        const avgEAR = (leftEAR + rightEAR) / 2

        const wasClosed = lastEarRef.current < EAR_THRESHOLD
        const isOpen = avgEAR >= EAR_THRESHOLD

        if (wasClosed && isOpen && !blinkCooldownRef.current) {
          blinkCooldownRef.current = true
          blinkCountRef.current += 1
          setBlinkCount(blinkCountRef.current)
          setTimeout(() => { blinkCooldownRef.current = false }, 500)

          if (blinkCountRef.current >= BLINKS_REQUIRED) {
            setPhase('blink_done')
            setTimeout(() => captureFrame(), 600)
            return
          }
        }
        lastEarRef.current = avgEAR

        // Draw face box on overlay
        if (ctx) {
          const box = detection.detection.box
          ctx.strokeStyle = blinkCountRef.current > 0 ? '#10b981' : '#111'
          ctx.lineWidth = 2
          ctx.strokeRect(box.x, box.y, box.width, box.height)
        }
      } else {
        setFaceDetected(false)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    animFrameRef.current = requestAnimationFrame(detect)
  }, [])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const f = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(f)
      setCapturedFile(f)
      setCapturedUrl(url)
      setPhase('captured')
      stopCamera()
    }, 'image/jpeg', 0.92)
  }, [])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    if ((phase === 'detecting' || phase === 'blink_prompt' || phase === 'blink_done') && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(e => console.error('Video play error:', e))
      }
    }
  }, [phase])

  useEffect(() => {
    return () => {
      stopCamera()
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    }
  }, [stopCamera])

  const retry = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedFile(null)
    setCapturedUrl(null)
    setBlinkCount(0)
    blinkCountRef.current = 0
    setFaceDetected(false)
    setPhase('intro')
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  return (
    <div>
      <div className="section-header">
        <h2>Face verification</h2>
        <p>We need to confirm you're a real person. Look at the camera and blink twice naturally.</p>
      </div>

      {phase === 'intro' && (
        <div>
          {error && (
            <div className="error-box">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M8 5v3M8 10h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <div className="intro-instructions">
            <div className="instruction-item">
              <div className="instruction-icon">💡</div>
              <div>
                <p className="instruction-title">Good lighting</p>
                <p className="instruction-sub">Find a well-lit area, facing a light source</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">👁</div>
              <div>
                <p className="instruction-title">Blink twice</p>
                <p className="instruction-sub">Blink naturally when prompted — slow and deliberate</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">📱</div>
              <div>
                <p className="instruction-title">Face the camera</p>
                <p className="instruction-sub">Keep your face centred and still</p>
              </div>
            </div>
          </div>

          <button className="primary-btn" onClick={loadFaceApi} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            Start camera
          </button>
          <button className="ghost-btn" onClick={onBack} type="button">← Back</button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="loading-state">
          <div className="spinner-large" />
          <p className="loading-text">Loading face detection models...</p>
          <p className="loading-sub">This may take a moment on first load</p>
        </div>
      )}

      {(phase === 'detecting' || phase === 'blink_prompt' || phase === 'blink_done') && (
        <div className="camera-wrapper">
          <div className="video-container">
            <video ref={videoRef} playsInline muted className="camera-video" />
            <canvas ref={overlayCanvasRef} className="overlay-canvas" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Face detection status */}
            <div className={`face-status ${faceDetected ? 'detected' : 'searching'}`}>
              {faceDetected ? (
                <>
                  <div className="status-dot green" />
                  Face detected
                </>
              ) : (
                <>
                  <div className="status-dot searching" />
                  Looking for face...
                </>
              )}
            </div>

            {/* Blink progress */}
            {phase === 'blink_prompt' && (
              <div className="blink-overlay">
                <p className="blink-instruction">Blink {BLINKS_REQUIRED} times</p>
                <div className="blink-dots">
                  {Array.from({ length: BLINKS_REQUIRED }).map((_, i) => (
                    <div key={i} className={`blink-dot ${i < blinkCount ? 'done' : ''}`} />
                  ))}
                </div>
              </div>
            )}

            {phase === 'blink_done' && (
              <div className="blink-success-overlay">
                <div className="blink-success-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p>Liveness confirmed</p>
              </div>
            )}
          </div>

          <div className="camera-hint">
            {phase === 'detecting' && !faceDetected && 'Position your face in the frame'}
            {phase === 'detecting' && faceDetected && 'Face detected — preparing...'}
            {phase === 'blink_prompt' && `Blink naturally ${BLINKS_REQUIRED} times (${blinkCount}/${BLINKS_REQUIRED})`}
            {phase === 'blink_done' && 'Capturing...'}
          </div>

          <div className="camera-actions" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="primary-btn" onClick={captureFrame} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Capture photo
            </button>
            <button className="ghost-btn" onClick={() => { stopCamera(); onBack(); }} type="button">Cancel</button>
          </div>
        </div>
      )}

      {phase === 'captured' && capturedUrl && (
        <div>
          <div className="captured-container">
            <img src={capturedUrl} alt="Captured selfie" className="captured-img" />
            <div className="captured-badge">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="#10b981" />
                <path d="M4.5 8l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Selfie captured
            </div>
          </div>

          <div className="captured-actions">
            <button className="primary-btn" onClick={() => capturedFile && onComplete(capturedFile)} type="button">
              Continue to verification
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="ghost-btn" onClick={retry} type="button">Retake selfie</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .section-header { margin-bottom: 24px; }
        .section-header h2 { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 6px; letter-spacing: -0.02em; }
        .section-header p { font-size: 14px; color: #6b7280; line-height: 1.5; }

        .error-box {
          display: flex; align-items: flex-start; gap: 8px;
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
          padding: 12px 14px; font-size: 13px; color: #dc2626; margin-bottom: 16px;
        }

        .intro-instructions { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .instruction-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px; background: #f9fafb; border-radius: 10px;
        }
        .instruction-icon { font-size: 20px; flex-shrink: 0; }
        .instruction-title { font-size: 13px; font-weight: 600; color: #111; margin-bottom: 2px; }
        .instruction-sub { font-size: 12px; color: #9ca3af; }

        .loading-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 48px 24px; text-align: center;
        }
        .spinner-large {
          width: 40px; height: 40px; border: 2.5px solid #e5e7eb;
          border-top-color: #111; border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { font-size: 15px; font-weight: 500; color: #374151; }
        .loading-sub { font-size: 13px; color: #9ca3af; }

        .camera-wrapper { display: flex; flex-direction: column; gap: 12px; }
        .video-container {
          position: relative; border-radius: 14px; overflow: hidden;
          background: #111; aspect-ratio: 4/3;
        }
        .camera-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .overlay-canvas {
          position: absolute; inset: 0; width: 100%; height: 100%;
          transform: scaleX(-1); pointer-events: none;
        }

        .face-status {
          position: absolute; top: 12px; left: 12px;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
          border-radius: 20px; padding: 5px 10px;
          font-size: 12px; font-weight: 500; color: white;
          display: flex; align-items: center; gap: 6px;
        }
        .status-dot {
          width: 7px; height: 7px; border-radius: 50%;
        }
        .status-dot.green { background: #10b981; }
        .status-dot.searching { background: #f59e0b; animation: blink-anim 1s ease-in-out infinite; }
        @keyframes blink-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .blink-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 20px 16px 16px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .blink-instruction { font-size: 14px; font-weight: 600; color: white; }
        .blink-dots { display: flex; gap: 8px; }
        .blink-dot {
          width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.5);
          transition: all 0.2s ease;
        }
        .blink-dot.done { background: #10b981; border-color: #10b981; transform: scale(1.2); }

        .blink-success-overlay {
          position: absolute; inset: 0; background: rgba(16,185,129,0.2);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
        }
        .blink-success-icon {
          width: 52px; height: 52px; background: #10b981; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .blink-success-overlay p { font-size: 16px; font-weight: 600; color: white; }

        .camera-hint {
          text-align: center; font-size: 13px; color: #6b7280; min-height: 20px;
        }

        .captured-container {
          position: relative; border-radius: 14px; overflow: hidden;
          border: 1.5px solid #e5e7eb; margin-bottom: 16px;
        }
        .captured-img {
          width: 100%; display: block; max-height: 300px;
          object-fit: contain; background: #f9fafb; transform: scaleX(-1);
        }
        .captured-badge {
          position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
          background: white; border: 1px solid #e5e7eb; border-radius: 20px;
          padding: 5px 12px; font-size: 12px; font-weight: 500; color: #111;
          display: flex; align-items: center; gap: 5px; white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .captured-actions { display: flex; flex-direction: column; gap: 8px; }

        .primary-btn {
          width: 100%; padding: 14px 24px; background: #111; color: white;
          border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 8px; transition: all 0.15s ease; letter-spacing: -0.01em;
        }
        .primary-btn:hover { background: #222; transform: translateY(-1px); }

        .ghost-btn {
          width: 100%; padding: 12px; background: transparent; color: #6b7280;
          border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px;
          font-weight: 500; cursor: pointer; transition: all 0.15s ease;
        }
        .ghost-btn:hover { border-color: #9ca3af; color: #374151; }
      `}</style>
    </div>
  )
}