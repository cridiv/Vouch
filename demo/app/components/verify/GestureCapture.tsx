'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

type Phase = 'intro' | 'loading' | 'straight' | 'left' | 'right' | 'complete'

interface CapturedFrames {
  straight: File
  left: File
  right: File
}

interface Props {
  onComplete: (frames: CapturedFrames) => void
  onBack: () => void
}

const PHASES: Phase[] = ['straight', 'left', 'right']
const HOLD_FRAMES_REQUIRED = 22
const GESTURE_COOLDOWN_MS = 1200

const PHASE_CONFIG = {
  straight: {
    label: 'Look straight ahead',
    sublabel: 'Hold still while your face is centred',
    arrow: null,
    check: (ratio: number) => ratio > 0.42 && ratio < 0.58,
  },
  left: {
    label: 'Turn your head left',
    sublabel: 'Slowly turn until the ring fills',
    arrow: 'left',
    check: (ratio: number) => ratio < 0.37,
  },
  right: {
    label: 'Turn your head right',
    sublabel: 'Slowly turn until the ring fills',
    arrow: 'right',
    check: (ratio: number) => ratio > 0.63,
  },
}

export default function GestureCapture({ onComplete, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceInBox, setFaceInBox] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0) // 0–1
  const [flashGreen, setFlashGreen] = useState(false)
  const [capturedThumbs, setCapturedThumbs] = useState<Partial<Record<Phase, string>>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)
  const faceApiRef = useRef<any>(null)
  const phaseRef = useRef<Phase>('straight')
  const holdCountRef = useRef(0)
  const cooldownRef = useRef(false)
  const capturedRef = useRef<Partial<CapturedFrames>>({})

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase }, [phase])


  const captureFrame = useCallback((phaseName: 'straight' | 'left' | 'right') => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mirror the image (video is mirrored via CSS)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)
    ctx.restore()

    const thumb = canvas.toDataURL('image/jpeg', 0.7)
    setCapturedThumbs(prev => ({ ...prev, [phaseName]: thumb }))

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `${phaseName}.jpg`, { type: 'image/jpeg' })
      capturedRef.current[phaseName] = file

      const nextPhaseMap: Record<string, Phase> = {
        straight: 'left',
        left: 'right',
        right: 'complete',
      }
      const next = nextPhaseMap[phaseName] as Phase

      setFlashGreen(true)
      setTimeout(() => setFlashGreen(false), 400)

      setTimeout(() => {
        holdCountRef.current = 0
        setHoldProgress(0)
        cooldownRef.current = false
        setPhase(next)
        phaseRef.current = next

        if (next === 'complete') {
          stopCamera()
          const { straight, left, right } = capturedRef.current
          if (straight && left && right) {
            onComplete({ straight, left, right })
          }
        }
      }, GESTURE_COOLDOWN_MS)
    }, 'image/jpeg', 0.92)
  }, [onComplete])

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const startDetectionLoop = useCallback(() => {
    const faceapi = faceApiRef.current

    const tick = async () => {
      const video = videoRef.current
      const overlay = overlayRef.current
      if (!video || !overlay || video.paused || video.ended || video.readyState < 2) {
        animRef.current = requestAnimationFrame(tick)
        return
      }

      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 480
      overlay.width = vw
      overlay.height = vh
      const ctx = overlay.getContext('2d')

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks(true)

      if (ctx) ctx.clearRect(0, 0, vw, vh)

      if (!detection) {
        setFaceDetected(false)
        setFaceInBox(false)
        holdCountRef.current = 0
        setHoldProgress(0)
        animRef.current = requestAnimationFrame(tick)
        return
      }

      setFaceDetected(true)

      const box = detection.detection.box
      const landmarks = detection.landmarks

      // Oval guide dimensions
      const ovalCX = vw / 2
      const ovalCY = vh / 2
      const ovalW = vw * 0.55
      const ovalH = vh * 0.78

      // Face-in-box check
      const faceCX = box.x + box.width / 2
      const faceCY = box.y + box.height / 2
      const withinX = Math.abs(faceCX - ovalCX) < ovalW * 0.22
      const withinY = Math.abs(faceCY - ovalCY) < ovalH * 0.2
      const goodSize = box.width > ovalW * 0.38 && box.width < ovalW * 1.05
      const inBox = withinX && withinY && goodSize
      setFaceInBox(inBox)

      // Nose ratio for head pose
      const noseTip = landmarks.positions[30]
      const leftEdge = landmarks.positions[0]
      const rightEdge = landmarks.positions[16]
      const faceWidth = rightEdge.x - leftEdge.x
      const noseRatio = faceWidth > 0 ? (noseTip.x - leftEdge.x) / faceWidth : 0.5

      const currentPhase = phaseRef.current
      const config = PHASE_CONFIG[currentPhase as keyof typeof PHASE_CONFIG]
      const gestureCorrect = config ? config.check(noseRatio) : false

      // Draw circular mask guide on overlay canvas
      if (ctx) {
        const isGood = inBox && gestureCorrect
        ctx.save()
        
        // 1. Create the mask (everything EXCEPT the oval)
        ctx.beginPath()
        // Outer rectangle (clockwise)
        ctx.rect(0, 0, vw, vh)
        // Inner oval (counter-clockwise)
        ctx.ellipse(ovalCX, ovalCY, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2, true)
        
        ctx.fillStyle = 'rgb(0, 0, 0)'
        ctx.fill()

        // 2. Draw the oval border
        ctx.beginPath()
        ctx.ellipse(ovalCX, ovalCY, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2)
        ctx.strokeStyle = isGood ? '#10b981' : inBox ? '#f59e0b' : 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 5
        ctx.stroke()

        // 3. Progress arc (clockwise from top)
        if (isGood && holdCountRef.current > 0) {
          const progress = holdCountRef.current / HOLD_FRAMES_REQUIRED
          ctx.beginPath()
          ctx.ellipse(ovalCX, ovalCY, ovalW / 2, ovalH / 2, 0, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = 7
          ctx.stroke()
        }

        ctx.restore()
      }

      // Hold logic
      if (inBox && gestureCorrect && !cooldownRef.current) {
        holdCountRef.current += 1
        setHoldProgress(holdCountRef.current / HOLD_FRAMES_REQUIRED)

        if (holdCountRef.current >= HOLD_FRAMES_REQUIRED) {
          cooldownRef.current = true
          const activePhase = phaseRef.current as 'straight' | 'left' | 'right'
          if (['straight', 'left', 'right'].includes(activePhase)) {
            captureFrame(activePhase)
            return
          }
        }
      } else if (!inBox || !gestureCorrect) {
        if (!cooldownRef.current) {
          holdCountRef.current = Math.max(0, holdCountRef.current - 2)
          setHoldProgress(holdCountRef.current / HOLD_FRAMES_REQUIRED)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
  }, [captureFrame])

  const loadAndStart = useCallback(async () => {
    setPhase('loading')
    setLoadError(null)

    try {
      // Load face-api if not already loaded
      if (!(window as any).faceapi) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/face-api.js/dist/face-api.min.js'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load face-api.js'))
          document.head.appendChild(s)
        })
      }
      faceApiRef.current = (window as any).faceapi
      const faceapi = faceApiRef.current

      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ])

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      streamRef.current = stream

      setPhase('straight')
      phaseRef.current = 'straight'
      startDetectionLoop()
    } catch (err: any) {
      setLoadError(err.message || 'Setup failed')
      setPhase('intro')
    }
  }, [startDetectionLoop])

  // Robustly attach stream when video element appears
  useEffect(() => {
    const video = videoRef.current
    if (video && streamRef.current && (['straight', 'left', 'right'] as Phase[]).includes(phase)) {
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current
        video.play().catch(e => console.error('Video play error:', e))
      }
    }
  }, [phase])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const currentConfig = phase in PHASE_CONFIG
    ? PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG]
    : null

  const phaseIndex = PHASES.indexOf(phase as any)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 600, color: '#111', letterSpacing: '-0.02em' }}>
          Face verification
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
          Position your face inside the oval and follow the prompts. Captures happen automatically.
        </p>
      </div>

      {phase === 'intro' && (
        <div>
          {loadError && (
            <div style={{
              display: 'flex', gap: 8, padding: '12px 14px', marginBottom: 16,
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              fontSize: 13, color: '#dc2626',
            }}>
              ⚠️ {loadError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '💡', title: 'Good lighting', sub: 'Face a light source — avoid backlight' },
              { icon: '📐', title: 'Three poses', sub: 'Look straight, then left, then right' },
              { icon: '🎯', title: 'Automatic capture', sub: 'Hold each pose — we capture it for you' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', gap: 12, padding: '12px 14px',
                background: '#f9fafb', borderRadius: 10,
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#111' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={loadAndStart}
            style={{
              width: '100%', padding: '14px', background: '#111', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            Start camera
          </button>

          <button
            onClick={onBack}
            style={{
              width: '100%', marginTop: 8, padding: '12px', background: 'transparent',
              color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 10,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid #e5e7eb',
            borderTopColor: '#111', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#374151' }}>Loading face detection...</p>
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>First load may take a moment</p>
        </div>
      )}

      {(['straight', 'left', 'right'] as Phase[]).includes(phase) && (
        <div>
          {/* Progress indicators */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
            {PHASES.map((p, i) => {
              const done = phaseIndex > i
              const active = phaseIndex === i
              const thumb = capturedThumbs[p]
              return (
                <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                    border: `2px solid ${done ? '#10b981' : active ? '#111' : '#e5e7eb'}`,
                    background: '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.3s ease',
                  }}>
                    {done && thumb ? (
                      <img src={thumb} alt={p} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    ) : done ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M4 9l3.5 3.5L14 5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{ fontSize: 18 }}>
                        {p === 'straight' ? '😐' : p === 'left' ? '👈' : '👉'}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: active ? '#111' : '#9ca3af', fontWeight: active ? 600 : 400 }}>
                    {p === 'straight' ? 'Centre' : p === 'left' ? 'Left' : 'Right'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Instruction */}
          {currentConfig && (
            <div style={{
              textAlign: 'center', marginBottom: 12, padding: '10px 16px',
              background: faceInBox ? '#f0fdf4' : '#f9fafb',
              borderRadius: 10, border: `1px solid ${faceInBox ? '#a7f3d0' : '#e5e7eb'}`,
              transition: 'all 0.2s ease',
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#111' }}>
                {currentConfig.arrow === 'left' && '← '}
                {currentConfig.label}
                {currentConfig.arrow === 'right' && ' →'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{currentConfig.sublabel}</p>
            </div>
          )}

          {/* Camera feed */}
          <div style={{
            position: 'relative', borderRadius: 16, overflow: 'hidden',
            background: '#111', aspectRatio: '4/3',
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
            />

            {/* Overlay canvas for oval + progress arc */}
            <canvas
              ref={overlayRef}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                pointerEvents: 'none', transform: 'scaleX(-1)',
              }}
            />

            {/* Hidden capture canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Green flash on capture */}
            {flashGreen && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(16, 185, 129, 0.35)',
                transition: 'opacity 0.2s ease',
              }} />
            )}

            {/* Face status pill */}
            <div style={{
              position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              borderRadius: 20, padding: '4px 12px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: faceInBox ? '#10b981' : faceDetected ? '#f59e0b' : '#6b7280',
                transition: 'background 0.2s ease',
              }} />
              <span style={{ fontSize: 11, color: 'white', fontWeight: 500 }}>
                {faceInBox ? 'Hold steady...' : faceDetected ? 'Move closer to the oval' : 'No face detected'}
              </span>
            </div>

            {/* Hold progress bar (bottom) */}
            {holdProgress > 0 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 4, background: 'rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  height: '100%', background: '#10b981',
                  width: `${holdProgress * 100}%`,
                  transition: 'width 0.05s ease',
                }} />
              </div>
            )}
          </div>

          {/* Phase hint below camera */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>
            {phaseIndex + 1} of {PHASES.length} — fit your face in the oval to begin
          </p>
        </div>
      )}

      {phase === 'complete' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 64, height: 64, background: '#111', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#111' }}>Face captured</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>All three poses captured. Submitting for verification...</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            {PHASES.map(p => capturedThumbs[p] && (
              <div key={p} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                  border: '2px solid #10b981',
                }}>
                  <img src={capturedThumbs[p]} alt={p} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9ca3af' }}>
                  {p === 'straight' ? 'Centre' : p === 'left' ? 'Left' : 'Right'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
