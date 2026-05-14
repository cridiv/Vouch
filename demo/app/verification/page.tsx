'use client'

import { useState } from 'react'
import StepIndicator from '@/app/components/verify/StepIndicator'
import DocTypeSelector, { DocType } from '@/app/components/verify/DocTypeSelector'
import DocumentUpload from '@/app/components/verify/DocumentUpload'
import LivenessCapture from '@/app/components/verify/LivenessCapture'
import VerificationResult from '@/app/components/verify/VerificationResult'
import vouch from '@/lib/vouch'

type Step = 1 | 2 | 3 | 4

// For testing — these would come from your auth context in the real app
const TEST_EXTERNAL_USER_ID = `user-${Date.now()}`

export default function VerifyPage() {
  const [step, setStep] = useState<Step>(1)
  const [docType, setDocType] = useState<DocType | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleDocumentComplete = (file: File) => {
    setDocumentFile(file)
    setStep(3)
  }

  const handleLivenessComplete = async (selfie: File) => {
    setSelfieFile(selfie)
    setStep(4)
    await runVerification(selfie)
  }

  const runVerification = async (selfie: File) => {
    if (!documentFile) return

    setLoading(true)
    setError(null)

    try {
      const response = await vouch.identity.verify(
        documentFile,
        selfie,
        TEST_EXTERNAL_USER_ID
      )

      setResult(response.data)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setStep(1)
    setDocType(null)
    setDocumentFile(null)
    setSelfieFile(null)
    setResult(null)
    setError(null)
    setLoading(false)
  }

  return (
    <div className="page">
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
            onContinue={() => {
              // In real app: redirect to dashboard or next step
              alert('✅ Verification complete! Redirecting to platform...')
            }}
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

        .card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06);
        }

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