'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import StepIndicator from '@/app/components/verify/StepIndicator'
import DocTypeSelector, { DocType } from '@/app/components/verify/DocTypeSelector'
import DocumentUpload from '@/app/components/verify/DocumentUpload'
import LivenessCapture from '@/app/components/verify/LivenessCapture'
import VerificationResult from '@/app/components/verify/VerificationResult'
import { Vouch } from 'vouch-sdk'

type Step = 1 | 2 | 3 | 4

function VerifyContent() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const apiKey = searchParams.get('key')
  const mode = searchParams.get('mode') // 'modal' or undefined

  const [step, setStep] = useState<Step>(1)
  const [docType, setDocType] = useState<DocType | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  // Use a dynamic Vouch instance
  const vouch = new Vouch(apiKey || process.env.NEXT_PUBLIC_VOUCH_API_KEY || '', {
    apiUrl: 'http://localhost:5000/v1'
  })

  const handleDocumentComplete = (file: File) => {
    setDocumentFile(file)
    setStep(3)
  }

  const handleLivenessComplete = async (frames: File[]) => {
    setStep(4)
    await runVerification(frames)
  }

  const runVerification = async (frames: File[]) => {
    if (!documentFile || !userId) return

    setLoading(true)
    setError(null)

    try {
      const response = await vouch.identity.submitVerification(
        documentFile,
        frames,
        userId
      )

      setResult(response.data)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (mode === 'modal') {
      window.parent.postMessage({
        source: 'vouch-identity',
        success: result?.identityVerified || false,
        result: {
          verified: result?.identityVerified,
          matchScore: result?.identityMatchScore,
          livenessPassed: result?.livenessPassed,
          documentType: result?.documentType,
          externalUserId: userId,
        }
      }, '*')
    } else {
      alert('✅ Verification complete!')
    }
  }

  const handleRetry = () => {
    setStep(1)
    setDocType(null)
    setDocumentFile(null)
    setResult(null)
    setError(null)
    setLoading(false)
  }

  if (!userId || !apiKey) {
    return (
      <div className="card">
        <div className="error-state">
          <h2>❌ Missing Session Info</h2>
          <p>This verification session is invalid. Please restart the flow from your application.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`page ${mode === 'modal' ? 'modal-mode' : ''}`}>
      <div className="card">
        {/* Logo */}
        <div className="logo">
          <div className="logo-mark">V</div>
          <span className="logo-text">Vouch</span>
        </div>

        <StepIndicator current={step} />

        {step === 1 && (
          <DocTypeSelector
            selected={docType}
            onSelect={setDocType}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && docType && (
          <DocumentUpload
            docType={docType}
            onComplete={handleDocumentComplete}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <LivenessCapture
            onComplete={handleLivenessComplete}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <VerificationResult
            loading={loading}
            error={error}
            result={result}
            onRetry={handleRetry}
            onContinue={handleContinue}
          />
        )}

        {/* Footer */}
        <div className="footer">
          <div className="footer-badge">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 4v5c0 3.314 2.686 6 6 6s6-2.686 6-6V4L8 1z" stroke="#9ca3af" strokeWidth="1.2" fill="none" />
              <path d="M5.5 8l2 2 3-3" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Secured by Vouch Trust Engine
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f5f5f7;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
        }

        .modal-mode {
          background: transparent;
          padding: 0;
        }

        .modal-mode .card {
          box-shadow: none;
          max-width: 100%;
          min-height: 100vh;
          border-radius: 0;
        }

        .card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06);
        }

        .error-state {
          text-align: center;
          padding: 40px 20px;
        }
        .error-state h2 { color: #ef4444; margin-bottom: 12px; }
        .error-state p { color: #6b7280; font-size: 14px; }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
        }

        .logo-mark {
          width: 28px;
          height: 28px;
          background: #111;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        .logo-text {
          font-size: 17px;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.04em;
        }

        .footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          justify-content: center;
        }

        .footer-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #9ca3af;
          font-weight: 500;
        }

        @media (max-width: 520px) {
          .page { padding: 0; align-items: flex-start; }
          .card { border-radius: 0; min-height: 100vh; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="page"><div className="card">Loading...</div></div>}>
      <VerifyContent />
    </Suspense>
  )
}