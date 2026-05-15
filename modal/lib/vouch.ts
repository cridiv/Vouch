import Vouch from 'vouch-sdk'

const vouch = new Vouch(
  process.env.NEXT_PUBLIC_VOUCH_API_KEY || '',
)

export default vouch