'use client'

export type DocType = 'passport' | 'drivers_license' | 'national_id'

interface DocOption {
  type: DocType
  label: string
  sublabel: string
  icon: React.ReactNode
}

const DOC_OPTIONS: DocOption[] = [
  {
    type: 'passport',
    label: 'International Passport',
    sublabel: 'Valid Nigerian or foreign passport',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </svg>
    ),
  },
  {
    type: 'drivers_license',
    label: "Driver's Licence",
    sublabel: 'Nigerian FRSC driver\'s licence',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="8" cy="12" r="2.5" />
        <path d="M13 10h5M13 14h3" />
      </svg>
    ),
  },
  {
    type: 'national_id',
    label: 'National ID Card',
    sublabel: 'NIMC National Identity Card or NIN slip',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M7 9h10M7 13h6" />
        <circle cx="17" cy="14" r="2" />
      </svg>
    ),
  },
]

interface Props {
  selected: DocType | null
  onSelect: (type: DocType) => void
  onContinue: () => void
}

export default function DocTypeSelector({ selected, onSelect, onContinue }: Props) {
  return (
    <div>
      <div className="section-header">
        <h2>Select document type</h2>
        <p>Choose the government-issued ID you will use for verification</p>
      </div>

      <div className="doc-grid">
        {DOC_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            className={`doc-card ${selected === opt.type ? 'selected' : ''}`}
            onClick={() => onSelect(opt.type)}
            type="button"
          >
            <div className="doc-icon">{opt.icon}</div>
            <div className="doc-text">
              <span className="doc-label">{opt.label}</span>
              <span className="doc-sublabel">{opt.sublabel}</span>
            </div>
            <div className="doc-check">
              {selected === opt.type && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#111" />
                  <path d="M4.5 8l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        className="primary-btn"
        onClick={onContinue}
        disabled={!selected}
        type="button"
      >
        Continue
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <style jsx>{`
        .section-header {
          margin-bottom: 24px;
        }
        .section-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #111;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }
        .section-header p {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
        .doc-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }
        .doc-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: white;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
          width: 100%;
        }
        .doc-card:hover {
          border-color: #9ca3af;
          background: #fafafa;
        }
        .doc-card.selected {
          border-color: #111;
          background: #f9fafb;
        }
        .doc-icon {
          width: 44px;
          height: 44px;
          background: #f3f4f6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          flex-shrink: 0;
        }
        .doc-card.selected .doc-icon {
          background: #111;
          color: white;
        }
        .doc-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .doc-label {
          font-size: 14px;
          font-weight: 600;
          color: #111;
        }
        .doc-sublabel {
          font-size: 12px;
          color: #9ca3af;
        }
        .doc-check {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .primary-btn {
          width: 100%;
          padding: 14px 24px;
          background: #111;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s ease;
          letter-spacing: -0.01em;
        }
        .primary-btn:hover:not(:disabled) {
          background: #222;
          transform: translateY(-1px);
        }
        .primary-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  )
}