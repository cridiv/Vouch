'use client'

interface Step {
  number: number
  label: string
}

const STEPS: Step[] = [
  { number: 1, label: 'Document Type' },
  { number: 2, label: 'Upload ID' },
  { number: 3, label: 'Face Check' },
  { number: 4, label: 'Result' },
]

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="step-indicator">
      {STEPS.map((step, i) => {
        const done = current > step.number
        const active = current === step.number
        return (
          <div key={step.number} className="step-row">
            <div className={`step-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              <div className="step-circle">
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${done ? 'done' : ''}`} />
            )}
          </div>
        )
      })}

      <style jsx>{`
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 40px;
        }
        .step-row {
          display: flex;
          align-items: center;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .step-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.5px solid #d1d5db;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          transition: all 0.25s ease;
        }
        .step-item.active .step-circle {
          border-color: #111;
          background: #111;
          color: white;
        }
        .step-item.done .step-circle {
          border-color: #111;
          background: #111;
          color: white;
        }
        .step-label {
          font-size: 11px;
          font-weight: 500;
          color: #9ca3af;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .step-item.active .step-label {
          color: #111;
        }
        .step-item.done .step-label {
          color: #6b7280;
        }
        .step-connector {
          width: 40px;
          height: 1.5px;
          background: #e5e7eb;
          margin: 0 4px;
          margin-bottom: 18px;
          transition: background 0.25s ease;
        }
        .step-connector.done {
          background: #111;
        }
      `}</style>
    </div>
  )
}