'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { DocType } from './DocTypeSelector'

const DOC_LABELS: Record<DocType, string> = {
  passport: 'International Passport',
  drivers_license: "Driver's Licence",
  national_id: 'National ID Card',
}

interface Props {
  docType: DocType
  onComplete: (file: File) => void
  onBack: () => void
}

type Mode = 'choose' | 'upload' | 'scan' | 'preview'

export default function DocumentUpload({ docType, onComplete, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, HEIC)')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB')
      return
    }
    const url = URL.createObjectURL(f)
    setFile(f)
    setPreview(url)
    setMode('preview')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const startScan = useCallback(async () => {
    setMode('scan')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      alert('Camera access denied. Please use file upload instead.')
      setMode('choose')
    } finally {
      setScanning(false)
    }
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
      const f = new File([blob], 'document-scan.jpg', { type: 'image/jpeg' })
      streamRef.current?.getTracks().forEach(t => t.stop())
      const url = URL.createObjectURL(f)
      setFile(f)
      setPreview(url)
      setMode('preview')
    }, 'image/jpeg', 0.92)
  }, [])

  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setMode('choose')
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [preview])

  useEffect(() => {
    if (mode === 'scan' && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(e => console.error('Video play error:', e))
      }
    }
  }, [mode])

  return (
    <div>
      <div className="section-header">
        <h2>Upload your {DOC_LABELS[docType]}</h2>
        <p>Make sure the document is clear, unobstructed, and all text is readable</p>
      </div>

      {mode === 'choose' && (
        <div className="choose-grid">
          <button className="choose-card" onClick={() => setMode('upload')} type="button">
            <div className="choose-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="choose-label">Upload file</span>
            <span className="choose-sub">JPG, PNG, PDF up to 10MB</span>
          </button>

          <button className="choose-card" onClick={startScan} type="button">
            <div className="choose-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7V1h-6M1 7V1h6M23 17v6h-6M1 17v6h6" />
                <rect x="5" y="5" width="14" height="14" rx="1" />
              </svg>
            </div>
            <span className="choose-label">Scan document</span>
            <span className="choose-sub">Use your camera</span>
          </button>
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <div
            className={`dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <p className="drop-text">Drop your document here</p>
            <p className="drop-sub">or click to browse files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          <button className="ghost-btn" onClick={() => setMode('choose')} type="button">← Back</button>
        </div>
      )}

      {mode === 'scan' && (
        <div className="scan-wrapper">
          {scanning && (
            <div className="scan-loading">
              <div className="spinner" />
              <p>Starting camera...</p>
            </div>
          )}
          <div className="video-container">
            <video ref={videoRef} playsInline muted className="scan-video" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="scan-overlay">
              <div className="scan-frame" />
              <p className="scan-hint">Position your document within the frame</p>
            </div>
          </div>
          <div className="scan-actions">
            <button className="primary-btn" onClick={captureFrame} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Capture
            </button>
            <button className="ghost-btn" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setMode('choose') }} type="button">Cancel</button>
          </div>
        </div>
      )}

      {mode === 'preview' && preview && (
        <div className="preview-wrapper">
          <div className="preview-img-container">
            <img src={preview} alt="Document preview" className="preview-img" />
            <div className="preview-badge">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="#10b981" />
                <path d="M4.5 8l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Document captured
            </div>
          </div>

          <div className="tips">
            <p className="tips-title">Before continuing, check:</p>
            <ul className="tips-list">
              <li>All four corners of the document are visible</li>
              <li>Your name and photo are clearly readable</li>
              <li>No glare or shadows covering important details</li>
            </ul>
          </div>

          <div className="preview-actions">
            <button className="primary-btn" onClick={() => file && onComplete(file)} type="button">
              Looks good — continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="ghost-btn" onClick={retake} type="button">Retake</button>
          </div>
        </div>
      )}

      {mode !== 'preview' && mode !== 'scan' && (
        <div style={{ marginTop: '16px' }}>
          <button className="ghost-btn" onClick={onBack} type="button">← Back</button>
        </div>
      )}

      <style jsx>{`
        .section-header { margin-bottom: 24px; }
        .section-header h2 { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 6px; letter-spacing: -0.02em; }
        .section-header p { font-size: 14px; color: #6b7280; line-height: 1.5; }

        .choose-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .choose-card {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; padding: 28px 16px; background: white;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          cursor: pointer; transition: all 0.15s ease;
        }
        .choose-card:hover { border-color: #111; background: #fafafa; }
        .choose-icon {
          width: 52px; height: 52px; background: #f3f4f6; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; color: #374151;
        }
        .choose-card:hover .choose-icon { background: #111; color: white; }
        .choose-label { font-size: 14px; font-weight: 600; color: #111; }
        .choose-sub { font-size: 11px; color: #9ca3af; text-align: center; }

        .dropzone {
          border: 2px dashed #e5e7eb; border-radius: 12px;
          padding: 48px 24px; text-align: center; cursor: pointer;
          transition: all 0.15s ease; margin-bottom: 16px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .dropzone:hover, .dropzone.dragover { border-color: #111; background: #fafafa; }
        .drop-text { font-size: 15px; font-weight: 500; color: #374151; }
        .drop-sub { font-size: 13px; color: #9ca3af; }

        .scan-wrapper { display: flex; flex-direction: column; gap: 16px; }
        .scan-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; }
        .spinner {
          width: 28px; height: 28px; border: 2px solid #e5e7eb;
          border-top-color: #111; border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .video-container { position: relative; border-radius: 12px; overflow: hidden; background: #000; aspect-ratio: 4/3; }
        .scan-video { width: 100%; height: 100%; object-fit: cover; }
        .scan-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
        }
        .scan-frame {
          width: 75%; aspect-ratio: 1.586; border: 2px solid white;
          border-radius: 8px; box-shadow: 0 0 0 2000px rgba(0,0,0,0.45);
        }
        .scan-hint { font-size: 13px; color: rgba(255,255,255,0.85); text-align: center; }
        .scan-actions { display: flex; flex-direction: column; gap: 8px; }

        .preview-wrapper { display: flex; flex-direction: column; gap: 16px; }
        .preview-img-container { position: relative; border-radius: 12px; overflow: hidden; border: 1.5px solid #e5e7eb; }
        .preview-img { width: 100%; display: block; max-height: 280px; object-fit: contain; background: #f9fafb; }
        .preview-badge {
          position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
          background: white; border: 1px solid #e5e7eb; border-radius: 20px;
          padding: 5px 12px; font-size: 12px; font-weight: 500; color: #111;
          display: flex; align-items: center; gap: 5px; white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .tips { background: #f9fafb; border-radius: 10px; padding: 14px 16px; }
        .tips-title { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .tips-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
        .tips-list li { font-size: 12px; color: #6b7280; padding-left: 14px; position: relative; }
        .tips-list li::before { content: '·'; position: absolute; left: 4px; color: #9ca3af; }

        .preview-actions { display: flex; flex-direction: column; gap: 8px; }

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