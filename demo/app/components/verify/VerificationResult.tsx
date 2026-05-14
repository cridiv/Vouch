'use client'

interface VerificationData {
  identityVerified: boolean
  identityMatchScore: number
  livenessPassed: boolean
  documentType: string
}

interface Props {
  loading: boolean
  error: string | null
  result: VerificationData | null
  onRetry: () => void
  onContinue: () => void
}

export default function VerificationResult({ loading, error, result, onRetry, onContinue }: Props) {
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-ring">
          <div className="spinner-inner" />
        </div>
        <h2>Verifying your identity</h2>
        <p>Our AI is analysing your documents. This usually takes 10–30 seconds.</p>

        <div className="loading-steps">
          <LoadingStep label="Analysing document" delay={0} />
          <LoadingStep label="Detecting face" delay={600} />
          <LoadingStep label="Matching biometrics" delay={1200} />
          <LoadingStep label="Running liveness check" delay={1800} />
        </div>

        <style jsx>{`
          .loading-state {
            display: flex; flex-direction: column; align-items: center;
            gap: 16px; padding: 16px 0; text-align: center;
          }
          .spinner-ring {
            width: 64px; height: 64px; border-radius: 50%;
            background: conic-gradient(#111 0deg, transparent 270deg);
            animation: spin 1.2s linear infinite; position: relative; flex-shrink: 0;
          }
          .spinner-inner {
            position: absolute; inset: 6px; background: white; border-radius: 50%;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { font-size: 20px; font-weight: 600; color: #111; letter-spacing: -0.02em; }
          p { font-size: 14px; color: #6b7280; line-height: 1.5; max-width: 280px; }
          .loading-steps { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 8px; }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2>Verification failed</h2>
        <p>{error}</p>
        <button className="primary-btn" onClick={onRetry} type="button">Try again</button>

        <style jsx>{`
          .error-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 16px 0; text-align: center; }
          .error-icon { width: 64px; height: 64px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          h2 { font-size: 20px; font-weight: 600; color: #111; }
          p { font-size: 14px; color: #6b7280; line-height: 1.5; max-width: 280px; }
          .primary-btn { padding: 14px 32px; background: #111; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
          .primary-btn:hover { background: #222; }
        `}</style>
      </div>
    )
  }

  if (!result) return null

  const passed = result.identityVerified && result.livenessPassed
  const score = result.identityMatchScore ?? 0
  const scoreColor = score >= 90 ? '#10b981' : score >= 75 ? '#f59e0b' : '#ef4444'

  return (
    <div className="result-state">
      <div className={`result-icon ${passed ? 'pass' : 'fail'}`}>
        {passed ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>

      <h2>{passed ? 'Identity verified' : 'Verification unsuccessful'}</h2>
      <p>
        {passed
          ? 'Your identity has been confirmed. You can now proceed on the platform.'
          : 'We could not fully verify your identity. Please ensure your document is valid and try again.'}
      </p>

      {/* Score breakdown */}
      <div className="score-card">
        <div className="score-row">
          <span className="score-label">Face match score</span>
          <span className="score-value" style={{ color: scoreColor }}>{score.toFixed(1)}%</span>
        </div>
        <div className="score-bar-bg">
          <div
            className="score-bar-fill"
            style={{ width: `${score}%`, background: scoreColor }}
          />
        </div>

        <div className="check-list">
          <CheckItem label="Identity document" passed={result.identityVerified} />
          <CheckItem label="Liveness detection" passed={result.livenessPassed} />
          <CheckItem label="Face match" passed={score >= 75} />
        </div>

        {result.documentType && (
          <div className="doc-type-tag">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="#6b7280" strokeWidth="1.5" />
              <path d="M5 8h6M5 11h4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {formatDocType(result.documentType)}
          </div>
        )}
      </div>

      {passed ? (
        <button className="primary-btn" onClick={onContinue} type="button">
          Continue to platform
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="fail-actions">
          <button className="primary-btn" onClick={onRetry} type="button">Try again</button>
          <p className="fail-hint">Make sure your document is clearly visible and your face is well lit</p>
        </div>
      )}

      <style jsx>{`
        .result-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0; text-align: center; }
        .result-icon {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .result-icon.pass { background: #111; }
        .result-icon.fail { background: #ef4444; }
        h2 { font-size: 22px; font-weight: 700; color: #111; letter-spacing: -0.03em; }
        p { font-size: 14px; color: #6b7280; line-height: 1.6; max-width: 300px; }

        .score-card {
          width: 100%; background: #f9fafb; border: 1.5px solid #e5e7eb;
          border-radius: 12px; padding: 16px; text-align: left;
        }
        .score-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .score-label { font-size: 13px; font-weight: 500; color: #374151; }
        .score-value { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .score-bar-bg { height: 6px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
        .score-bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }

        .check-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

        .doc-type-tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: white; border: 1px solid #e5e7eb; border-radius: 6px;
          padding: 4px 10px; font-size: 12px; color: #6b7280;
        }

        .primary-btn {
          width: 100%; padding: 14px 24px; background: #111; color: white;
          border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 8px; transition: all 0.15s ease; letter-spacing: -0.01em;
        }
        .primary-btn:hover { background: #222; transform: translateY(-1px); }

        .fail-actions { width: 100%; display: flex; flex-direction: column; gap: 8px; }
        .fail-hint { font-size: 12px; color: #9ca3af; text-align: center; }
      `}</style>
    </div>
  )
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: passed ? '#111' : '#fef2f2',
        border: `1.5px solid ${passed ? '#111' : '#fecaca'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {passed ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 7l4-4M7 7L3 3" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13, color: passed ? '#374151' : '#9ca3af' }}>{label}</span>
    </div>
  )
}

function LoadingStep({ label, delay }: { label: string; delay: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: '#f9fafb',
      border: '1.5px solid #e5e7eb', borderRadius: 8,
      animation: `fadeIn 0.3s ease ${delay}ms both`,
    }}>
      <div style={{
        width: 16, height: 16, border: '2px solid #e5e7eb',
        borderTopColor: '#111', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite', flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: '#374151', textAlign: 'left' }}>{label}</span>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function formatDocType(type: string): string {
  const map: Record<string, string> = {
    passport: 'International Passport',
    drivers_license: "Driver's Licence",
    national_id: 'National ID Card',
    'drivers license': "Driver's Licence",
  }
  return map[type.toLowerCase()] || type
}