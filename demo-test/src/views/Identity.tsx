import { useState, useEffect } from 'react';
import { OutputPanel } from '../components/OutputPanel';
import { storage } from '../lib/storage';
import { Vouch } from 'vouch-sdk';

export function Identity() {
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
    backendUrl: 'https://vouch-fmql.onrender.com',
    verifyUrl: 'http://localhost:3000', // The Next.js demo app
  });

  useEffect(() => {
    setState(storage.getAll());
    const interval = setInterval(() => setState(storage.getAll()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getVouch = () => {
    if (!state.apiKey) return null;
    return new Vouch(state.apiKey, {
      apiUrl: `${state.backendUrl}/v1`,
      verifyUrl: state.verifyUrl,
    });
  };

  const verify = async (role: 'buyer' | 'seller') => {
    const externalUserId = role === 'buyer' ? state.buyerId : state.sellerId;
    const setOutput = role === 'buyer' ? setBuyerOutput : setSellerOutput;
    const setVariant = role === 'buyer' ? setBuyerVariant : setSellerVariant;

    const vouch = getVouch();
    if (!vouch || !externalUserId) {
      setOutput('❌ SDK not initialized or User ID missing');
      setVariant('error');
      return;
    }

    setOutput('⏳ Opening Vouch Identity Modal...');
    setVariant('default');

    try {
      // Launch the modal!
      const result = await vouch.identity.verify(externalUserId);
      
      console.log('Verification Result:', result);

      const verified = result.data.identityVerified;
      setVariant(verified ? 'success' : 'error');
      setOutput(
        `${verified ? '✅ IDENTITY VERIFIED via Modal' : '❌ IDENTITY FAILED'}\n\n` +
        `Face Match Score:  ${(result.data.identityMatchScore || 0).toFixed(1)}%\n` +
        `Liveness Passed:   ${result.data.livenessPassed ? '✅ Yes' : '❌ No'}\n` +
        `Document Type:     ${result.data.documentType || 'Unknown'}\n\n` +
        `External User ID:  ${externalUserId}`
      );
    } catch (err: any) {
      if (err.cancelled) {
        setOutput('⚠️ Verification was cancelled by the user.');
        setVariant('default');
      } else {
        setOutput(`❌ Error: ${err.message}`);
        setVariant('error');
      }
    }
  };

  const markVerified = async (role: 'buyer' | 'seller') => {
    const externalUserId = role === 'buyer' ? state.buyerId : state.sellerId;
    const setOutput = role === 'buyer' ? setBuyerOutput : setSellerOutput;
    const setVariant = role === 'buyer' ? setBuyerVariant : setSellerVariant;

    setOutput('⏳ Marking as verified...');
    setVariant('default');

    try {
      const response = await fetch(`${state.backendUrl}/v1/developer/mark-verified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': state.apiKey!,
        },
        body: JSON.stringify({ externalUserId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || JSON.stringify(data));

      setVariant('success');
      setOutput(
        `✅ IDENTITY MARKED AS VERIFIED (Test Bypass)\n\n` +
        `Match Score:       95%\n` +
        `Liveness Passed:   ✅ Yes\n` +
        `Document Type:     test_bypass\n\n` +
        `External User ID:  ${externalUserId}\n\n` +
        `⚡ You can now test fraud/escrow flows without running the ML pipeline.`
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
        ✅ SDK Mode Enabled: Modal UI{'\n'}
        Buyer: {state.buyerId}{'\n'}
        Seller: {state.sellerId}
      </OutputPanel>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Buyer */}
        <div className="border border-gray-800 p-6 rounded-xl bg-gray-900/30">
          <h3 className="text-lg font-bold text-blue-400 mb-2">👤 Buyer</h3>
          <div className="text-xs text-gray-500 mb-6">External ID: {state.buyerId}</div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-blue-900/30 rounded-lg text-sm text-blue-100">
              Identity verification will now open in a secure modal overlay.
            </div>

            <button
              onClick={() => verify('buyer')}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              Verify Buyer Identity
            </button>

            <button
              onClick={() => markVerified('buyer')}
              className="w-full px-4 py-2 bg-transparent hover:bg-green-900/20 text-green-500 rounded-lg font-mono text-xs cursor-pointer border border-green-900/50 transition-all"
            >
              ⚡ Quick Skip (Mark as Verified)
            </button>

            <OutputPanel variant={buyerVariant}>{buyerOutput}</OutputPanel>
          </div>
        </div>

        {/* Seller */}
        <div className="border border-gray-800 p-6 rounded-xl bg-gray-900/30">
          <h3 className="text-lg font-bold text-blue-400 mb-2">🏪 Seller</h3>
          <div className="text-xs text-gray-500 mb-6">External ID: {state.sellerId}</div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-blue-900/30 rounded-lg text-sm text-blue-100">
              Identity verification will now open in a secure modal overlay.
            </div>

            <button
              onClick={() => verify('seller')}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              Verify Seller Identity
            </button>

            <button
              onClick={() => markVerified('seller')}
              className="w-full px-4 py-2 bg-transparent hover:bg-green-900/20 text-green-500 rounded-lg font-mono text-xs cursor-pointer border border-green-900/50 transition-all"
            >
              ⚡ Quick Skip (Mark as Verified)
            </button>

            <OutputPanel variant={sellerVariant}>{sellerOutput}</OutputPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
