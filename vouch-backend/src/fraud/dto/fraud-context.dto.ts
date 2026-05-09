export class FraudContextDto {
  transaction_id: string
  platform_user_id: string
  external_user_id: string
  ip_address: string
  ip_reputation_score: number
  is_vpn: boolean
  is_proxy: boolean
  geolocation: { country: string; city: string }
  onboarding_location: { country: string; city: string } | null
  location_distance_km: number
  impossible_travel: boolean
  device_fingerprint: string
  device_seen_before: boolean
  device_matches_onboarding: boolean
  account_age_days: number
  previous_transactions: number
  transaction_amount: number
  time_since_last_tx_hrs: number
  identity_verified: boolean
  identity_match_score: number
  liveness_passed: boolean
  // Squad signals — populated after first payment webhook
  squad_payment_channel?: string
  squad_card_bin?: string
  squad_payer_name?: string
  squad_amount_matches_agreement?: boolean
  squad_transaction_ref?: string
}