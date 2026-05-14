import Vouch from 'vouch-sdk'

const vouch = new Vouch(
  process.env.NEXT_PUBLIC_VOUCH_API_KEY || 'vouch_753b8e1c4ec6c3f4c7149ffc88bf37987aa2a0c81a1a09ee',
)

export default vouch