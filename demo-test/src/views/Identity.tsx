import { useState, useEffect } from 'react';
import { OutputPanel } from '../components/OutputPanel';
import { storage } from '../lib/storage';

export function Identity() {
  const [buyerDoc, setBuyerDoc] = useState<File | null>(null);
  const [buyerSelfie, setBuyerSelfie] = useState<File | null>(null);
  const [sellerDoc, setSellerDoc] = useState<File | null>(null);
  const [sellerSelfie, setSellerSelfie] = useState<File | null>(null);

  const [buyerOutput, setBuyerOutput] = useState('Waiting...');
  const [sellerOutput, setSellerOutput] = useState('Waiting...');
  const [buyerVariant, setBuyerVariant] = useState<'default' | 'success' | 'error'>('default');
  const [sellerVariant, setSellerVariant] = useState<'default' | 'success' | 'error'>('default');

  const [state, setState] = useState({
    apiKey: null as string | null,
    developerId: null as string | null,
    buyerId: null as string | null,
    sellerId: null as string | null,
    agreementId: null as string | null,
    backendUrl: 'http://localhost:5000',
  });

  useEffect(() => {
    setState(storage.getAll());
    const interval = setInterval(() => setState(storage.getAll()), 1000);
    return () => clearInterval(interval);
  }, []);

  const verify = async (role: 'buyer' | 'seller') => {
    const externalUserId = role === 'buyer' ? state.buyerId : state.sellerId;
    const docFile = role === 'buyer' ? buyerDoc : sellerDoc;
    const selfieFile = role === 'buyer' ? buyerSelfie : sellerSelfie;
    const setOutput = role === 'buyer' ? setBuyerOutput : setSellerOutput;
    const setVariant = role === 'buyer' ? setBuyerVariant : setSellerVariant;

    if (!docFile || !selfieFile) {
      setOutput('❌ Please select both document and selfie images');
      setVariant('error');
      return;
    }

    setOutput('⏳ Running identity verification...\nThis may take 10-30 seconds (DeepFace loading)...');
    setVariant('default');

    try {
      const formData = new FormData();
      formData.append('document_image', docFile);
      formData.append('selfie_image', selfieFile);
      formData.append('external_user_id', externalUserId!);
      formData.append('device_fingerprint', `test-harness-fp-${role}`);

      const response = await fetch(`${state.backendUrl}/v1/identity/verify`, {
        method: 'POST',
        headers: { 'x-api-key': state.apiKey! },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || JSON.stringify(data));

      const verified = data.verified;
      setVariant(verified ? 'success' : 'error');
      setOutput(
        `${verified ? '✅ IDENTITY VERIFIED' : '❌ IDENTITY FAILED'}\n\n` +
        `Face Match Score:  ${(data.match_score || 0).toFixed(1)}%\n` +
        `Liveness Passed:   ${data.liveness_passed ? '✅ Yes' : '❌ No'}\n` +
        `Document Type:     ${data.document_type || 'Unknown'}\n` +
        `Rejection Reason:  ${data.rejection_reason || 'None'}\n\n` +
        `External User ID:  ${externalUserId}`
      );
    } catch (err: any) {
      setOutput(`❌ Error: ${err.message}`);
      setVariant('error');
    }
  };

  if (!state.apiKey) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-500 mb-6">Step 2 — Identity Verification</h1>
        <OutputPanel variant="error">
          ❌ No API key found. Go back to Setup (Page 1) first.
        </OutputPanel>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-500 mb-6">Step 2 — Identity Verification</h1>

      <OutputPanel variant="success">
        ✅ API Key loaded: {state.apiKey.slice(0, 20)}...{'\n'}
        Buyer: {state.buyerId}{'\n'}
        Seller: {state.sellerId}
      </OutputPanel>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Buyer */}
        <div className="border border-gray-800 p-4 rounded">
          <h3 className="text-lg font-bold text-blue-400 mb-2">👤 Buyer</h3>
          <div className="text-xs text-gray-500 mb-4">External ID: {state.buyerId}</div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Government ID (photo)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBuyerDoc(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Selfie</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBuyerSelfie(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
              />
            </div>

            <button
              onClick={() => verify('buyer')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm cursor-pointer"
            >
              Verify Buyer Identity
            </button>

            <OutputPanel variant={buyerVariant}>{buyerOutput}</OutputPanel>
          </div>
        </div>

        {/* Seller */}
        <div className="border border-gray-800 p-4 rounded">
          <h3 className="text-lg font-bold text-blue-400 mb-2">🏪 Seller</h3>
          <div className="text-xs text-gray-500 mb-4">External ID: {state.sellerId}</div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Government ID (photo)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSellerDoc(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Selfie</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSellerSelfie(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
              />
            </div>

            <button
              onClick={() => verify('seller')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm cursor-pointer"
            >
              Verify Seller Identity
            </button>

            <OutputPanel variant={sellerVariant}>{sellerOutput}</OutputPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
