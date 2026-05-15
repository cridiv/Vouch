'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onComplete: (frames: File[]) => void
  onBack: () => void
}

type Phase = 'intro' | 'loading' | 'ready' | 'recording' | 'processing' | 'complete'

const RECORDING_DURATION_MS = 3000
const TARGET_FRAMES = 15 // Extract 15 frames from the 3-second video
const FRAME_INTERVAL = RECORDING_DURATION_MS / TARGET_FRAMES

export default function LivenessCapture({ onComplete, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [error, setError] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceInOval, setFaceInOval] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0) // 0-100
  const [countdown, setCountdown] = useState(3)

  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const faceApiRef = useRef<any>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)

  // ── Initialization ──────────────────────────────────────────────────────────

  const loadFaceApi = useCallback(async () => {
    setPhase('loading')
    setError(null)

    try {
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
      const faceapi = faceApiRef.current

      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ])

      await startCamera()
    } catch (err: any) {
      setError(err.message || 'Failed to load face detection modules')
      setPhase('intro')
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setPhase('ready')
      startDetectionLoop()
    } catch (err) {
      setError('Camera access denied. Please allow camera access in your browser.')
      setPhase('intro')
    }
  }, [])

  // ── Detection Loop ──────────────────────────────────────────────────────────

  const startDetectionLoop = useCallback(() => {
    const faceapi = faceApiRef.current
    if (!faceapi) return

    const detect = async () => {
      const video = videoRef.current
      const overlay = overlayRef.current
      
      if (!video || !overlay || video.paused || video.ended || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
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

      if (ctx) {
        ctx.clearRect(0, 0, vw, vh)

        const ovalCX = vw / 2
        const ovalCY = vh / 2
        const ovalW = vw * 0.55
        const ovalH = vh * 0.78

        // Draw HUD Mask
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, vw, vh)
        ctx.ellipse(ovalCX, ovalCY, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2, true)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fill()

        if (detection) {
          const box = detection.detection.box
          const faceCX = box.x + box.width / 2
          const faceCY = box.y + box.height / 2

          // Check if face is centered in oval (Very relaxed)
          const withinX = Math.abs(faceCX - ovalCX) < ovalW * 0.45
          const withinY = Math.abs(faceCY - ovalCY) < ovalH * 0.4
          const goodSize = box.width > ovalW * 0.2 && box.width < ovalW * 1.25
          const inOval = withinX && withinY && goodSize

          setFaceDetected(true)
          setFaceInOval(inOval)

          // Debug: Draw face center dot and box
          ctx.fillStyle = inOval ? '#10b981' : '#f59e0b'
          ctx.beginPath()
          ctx.arc(faceCX, faceCY, 5, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.lineWidth = 1
          ctx.strokeRect(box.x, box.y, box.width, box.height)

          ctx.beginPath()
          ctx.ellipse(ovalCX, ovalCY, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2)
          ctx.strokeStyle = inOval ? '#10b981' : '#f59e0b'
          ctx.lineWidth = 5
          ctx.stroke()
        } else {
          setFaceDetected(false)
          setFaceInOval(false)
          ctx.beginPath()
          ctx.ellipse(ovalCX, ovalCY, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.lineWidth = 4
          ctx.stroke()
        }
        ctx.restore()
      }

      if (phase === 'ready' || phase === 'recording') {
        animFrameRef.current = requestAnimationFrame(detect)
      }
    }

    animFrameRef.current = requestAnimationFrame(detect)
  }, [phase])

  // ── Recording & Processing ──────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!streamRef.current) return

    setPhase('recording')
    recordedChunksRef.current = []
    recordingStartTimeRef.current = Date.now()

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8',
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      setPhase('processing')
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      await processVideo(blob)
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()

    const interval = setInterval(() => {
      const elapsed = Date.now() - recordingStartTimeRef.current
      const progress = Math.min((elapsed / RECORDING_DURATION_MS) * 100, 100)
      setRecordingProgress(progress)
      setCountdown(Math.ceil((RECORDING_DURATION_MS - elapsed) / 1000))

      if (elapsed >= RECORDING_DURATION_MS) {
        clearInterval(interval)
        if (mediaRecorder.state === 'recording') mediaRecorder.stop()
      }
    }, 50)
  }, [])

  const processVideo = async (blob: Blob) => {
    const videoUrl = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = true
    await new Promise(r => video.onloadedmetadata = r)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    const frames: File[] = []

    for (let i = 0; i < TARGET_FRAMES; i++) {
      video.currentTime = (i * FRAME_INTERVAL) / 1000
      await new Promise(r => video.onseeked = r)
      
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -canvas.width, 0)
      ctx.restore()

      const frameBlob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.9))
      frames.push(new File([frameBlob], `frame_${i}.jpg`, { type: 'image/jpeg' }))
    }

    URL.revokeObjectURL(videoUrl)
    setPhase('complete')
    stopCamera()
    onComplete(frames)
  }

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  useEffect(() => {
    const video = videoRef.current
    if (video && streamRef.current && (phase === 'ready' || phase === 'recording')) {
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current
        video.play().catch(console.error)
      }
    }
  }, [phase])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="liveness-capture">
      <div className="section-header">
        <h2>Identity Verification</h2>
        <p>Position your face within the oval and record a 3-second video selfie.</p>
      </div>

      {phase === 'intro' && (
        <div className="intro-view">
          {error && <div className="error-pill">⚠️ {error}</div>}
          <div className="guide-cards">
            <div className="guide-card">
              <span className="icon">💡</span>
              <div>
                <h4>Proper Lighting</h4>
                <p>Ensure your face is clearly visible without strong shadows.</p>
              </div>
            </div>
            <div className="guide-card">
              <span className="icon">👤</span>
              <div>
                <h4>Stay Centered</h4>
                <p>Keep your face within the guide for the entire 3 seconds.</p>
              </div>
            </div>
          </div>
          <button className="primary-action-btn" onClick={loadFaceApi}>
            Start Camera
          </button>
          <button className="secondary-text-btn" onClick={onBack}>← Go Back</button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="loading-view">
          <div className="pulse-loader" />
          <p>Initializing security modules...</p>
        </div>
      )}

      {(phase === 'ready' || phase === 'recording') && (
        <div className="capture-view">
          <div className={`status-banner ${faceInOval ? 'success' : 'warning'}`}>
            {phase === 'recording' ? (
              <span className="recording-label"><span className="dot" /> Recording...</span>
            ) : faceInOval ? (
              'Ready to record'
            ) : faceDetected ? (
              'Center your face in the oval'
            ) : (
              'Position your face'
            )}
          </div>

          <div className="video-viewport">
            <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
            <canvas ref={overlayRef} className="hud-overlay" />
            
            {phase === 'recording' && (
              <div className="recording-countdown">{countdown}</div>
            )}
            
            <div className="progress-track">
              <div className="progress-thumb" style={{ width: `${recordingProgress}%` }} />
            </div>
          </div>

          {phase === 'ready' && (
            <button 
              className="record-btn" 
              onClick={startRecording}
            >
              <div className="inner-circle" />
              Start 3s Recording
            </button>
          )}

          <button className="cancel-btn" onClick={() => { stopCamera(); onBack(); }}>Cancel</button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="processing-view">
          <div className="spinner" />
          <h3>Processing Video</h3>
          <p>Extracting biometric frames for verification...</p>
        </div>
      )}

      {phase === 'complete' && (
        <div className="complete-view">
          <div className="check-icon">✓</div>
          <h3>Capture Complete</h3>
          <p>Submitting your data securely.</p>
        </div>
      )}

      <style jsx>{`
        .liveness-capture { width: 100%; max-width: 440px; margin: 0 auto; }
        .section-header { margin-bottom: 24px; text-align: center; }
        .section-header h2 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 8px; }
        .section-header p { font-size: 14px; color: #6b7280; }

        .guide-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .guide-card { display: flex; gap: 16px; padding: 16px; background: #f9fafb; border-radius: 12px; align-items: center; }
        .guide-card .icon { font-size: 24px; }
        .guide-card h4 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .guide-card p { font-size: 13px; color: #6b7280; }

        .video-viewport { position: relative; border-radius: 20px; overflow: hidden; background: #000; aspect-ratio: 4/5; margin-bottom: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .camera-feed { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .hud-overlay { position: absolute; inset: 0; width: 100%; height: 100%; transform: scaleX(-1); pointer-events: none; }

        .status-banner { text-align: center; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 12px; transition: all 0.3s; }
        .status-banner.success { background: #ecfdf5; color: #059669; }
        .status-banner.warning { background: #fffbeb; color: #d97706; }

        .recording-countdown { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 80px; font-weight: 800; color: white; text-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: none; }
        .recording-label { display: flex; align-items: center; justify-content: center; gap: 8px; color: #ef4444; }
        .recording-label .dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: blink 1s infinite; }

        .progress-track { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(255,255,255,0.2); }
        .progress-thumb { height: 100%; background: #10b981; transition: width 0.1s linear; }

        .record-btn { width: 100%; padding: 16px; background: #111; color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; }
        .record-btn:disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
        .record-btn .inner-circle { width: 12px; height: 12px; background: #ef4444; border-radius: 50%; }

        .primary-action-btn { width: 100%; padding: 16px; background: #111; color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; }
        .secondary-text-btn { width: 100%; margin-top: 12px; background: none; border: none; color: #6b7280; font-size: 14px; cursor: pointer; }
        .cancel-btn { width: 100%; background: none; border: none; color: #6b7280; font-size: 14px; cursor: pointer; }

        .loading-view, .processing-view, .complete-view { display: flex; flex-direction: column; align-items: center; padding: 60px 0; text-align: center; }
        .pulse-loader { width: 50px; height: 50px; border: 4px solid #f3f4f6; border-top-color: #111; border-radius: 50%; animation: spin 1s infinite linear; }
        .spinner { width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s infinite linear; margin-bottom: 16px; }
        .check-icon { width: 60px; height: 60px; background: #10b981; color: white; font-size: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .error-pill { padding: 10px 16px; background: #fef2f2; color: #dc2626; border-radius: 10px; font-size: 13px; margin-bottom: 16px; text-align: center; }
      `}</style>
    </div>
  )
}