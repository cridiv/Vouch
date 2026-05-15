// LocalStorage wrapper for state persistence

const KEYS = {
  API_KEY: 'vouch_api_key',
  DEVELOPER_ID: 'vouch_developer_id',
  BUYER_ID: 'vouch_buyer_id',
  SELLER_ID: 'vouch_seller_id',
  AGREEMENT_ID: 'vouch_agreement_id',
  BACKEND_URL: 'vouch_backend_url',
} as const;

export const storage = {
  getApiKey: () => (typeof window !== 'undefined' ? localStorage.getItem(KEYS.API_KEY) : null),
  setApiKey: (key: string) => (typeof window !== 'undefined' ? localStorage.setItem(KEYS.API_KEY, key) : null),
  
  getDeveloperId: () => (typeof window !== 'undefined' ? localStorage.getItem(KEYS.DEVELOPER_ID) : null),
  setDeveloperId: (id: string) => (typeof window !== 'undefined' ? localStorage.setItem(KEYS.DEVELOPER_ID, id) : null),
  
  getBuyerId: () => (typeof window !== 'undefined' ? localStorage.getItem(KEYS.BUYER_ID) : null),
  setBuyerId: (id: string) => (typeof window !== 'undefined' ? localStorage.setItem(KEYS.BUYER_ID, id) : null),
  
  getSellerId: () => (typeof window !== 'undefined' ? localStorage.getItem(KEYS.SELLER_ID) : null),
  setSellerId: (id: string) => (typeof window !== 'undefined' ? localStorage.setItem(KEYS.SELLER_ID, id) : null),
  
  getAgreementId: () => (typeof window !== 'undefined' ? localStorage.getItem(KEYS.AGREEMENT_ID) : null),
  setAgreementId: (id: string) => (typeof window !== 'undefined' ? localStorage.setItem(KEYS.AGREEMENT_ID, id) : null),
  
  getBackendUrl: () => (typeof window !== 'undefined' ? localStorage.getItem(KEYS.BACKEND_URL) || 'https://vouch-fmql.onrender.com' : 'https://vouch-fmql.onrender.com'),
  setBackendUrl: (url: string) => (typeof window !== 'undefined' ? localStorage.setItem(KEYS.BACKEND_URL, url) : null),
  
  clearAll: () => {
    if (typeof window !== 'undefined') {
      Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    }
  },
  
  getAll: () => ({
    apiKey: storage.getApiKey(),
    developerId: storage.getDeveloperId(),
    buyerId: storage.getBuyerId(),
    sellerId: storage.getSellerId(),
    agreementId: storage.getAgreementId(),
    backendUrl: storage.getBackendUrl(),
  }),
};
