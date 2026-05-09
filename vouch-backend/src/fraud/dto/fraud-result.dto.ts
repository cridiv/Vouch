export class FraudResultDto {
  score: number          // 0–100
  flag: 'GREEN' | 'AMBER' | 'RED'
  category: string       // 'Low Risk' | 'Elevated Risk' | 'High Risk' | 'Critical'
  triggered_signals: string[]
  recommendation: 'proceed' | 'require_additional_verification' | 'block'
  processing_time_ms: number
}