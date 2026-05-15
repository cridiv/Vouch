import { useState, useEffect } from 'react';
import { OutputPanel } from '../components/OutputPanel';
import { storage } from '../lib/storage';

export function Setup() {
  const [backendUrl, setBackendUrl] = useState('https://vouch-fmql.onrender.com');
  const [email, setEmail] = useState('test@vouch.dev');
  const [supabaseUid, setSupabaseUid] = useState('test-uid-001');
  const [output, setOutput] = useState('Waiting...');
  const [outputVariant, setOutputVariant] = useState<'default' | 'success' | 'error'>('default');
  const [state, setState] = useState({
    apiKey: null as string | null,
    developerId: null as string | null,
    buyerId: null as string | null,
    sellerId: null as string | null,
    agreementId: null as string | null,
    backendUrl: 'https://vouch-fmql.onrender.com',
  });

  useEffect(() => {
    const allState = storage.getAll();
    setState(allState);
    if (allState.backendUrl) {
      setBackendUrl(allState.backendUrl);
    }
  }, []);

  useEffect(() => {
    storage.setBackendUrl(backendUrl);
  }, [backendUrl]);

  const provision = async () => {
    setOutput('Provisioning...');
    setOutputVariant('default');

    try {
      const response = await fetch(`${backendUrl}/v1/developer/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, supabaseUid }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Provision failed');

      // Save state
      storage.setApiKey(data.apiKey.rawKey);
      storage.setDeveloperId(data.developerId);
      
      const ts = Date.now();
      storage.setBuyerId(`buyer-${ts}`);
      storage.setSellerId(`seller-${ts}`);

      setOutput(
        `✅ Developer provisioned!\n\n` +
        `API Key (save this — shown once):\n${data.apiKey.rawKey}\n\n` +
        `Developer ID: ${data.developerId}\n\n` +
        `Test Buyer ID: buyer-${ts}\n` +
        `Test Seller ID: seller-${ts}`
      );
      setOutputVariant('success');
      setState(storage.getAll());
    } catch (err: any) {
      setOutput(`❌ Error: ${err.message}`);
      setOutputVariant('error');
    }
  };

  const clearAll = () => {
    storage.clearAll();
    setOutput('🗑️ Cleared all state');
    setState(storage.getAll());
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-500 mb-6">Step 1 — Developer Setup</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Backend URL</label>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Your Email (for provisioning)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Supabase UID (any unique string for testing)</label>
          <input
            type="text"
            value={supabaseUid}
            onChange={(e) => setSupabaseUid(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={provision}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm cursor-pointer"
        >
          Provision Developer Account
        </button>
        <button
          onClick={clearAll}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded font-mono text-sm cursor-pointer"
        >
          Clear All Saved State
        </button>
      </div>

      <OutputPanel variant={outputVariant}>{output}</OutputPanel>

      <hr className="border-gray-800 my-6" />

      <h2 className="text-xl font-bold text-blue-500 mb-4">Current Saved State</h2>
      <OutputPanel>
        {JSON.stringify({
          apiKey: state.apiKey ? `✅ ${state.apiKey.slice(0, 20)}...` : '❌ Not set',
          developerId: state.developerId || '❌ Not set',
          buyerId: state.buyerId || '❌ Not set',
          sellerId: state.sellerId || '❌ Not set',
          agreementId: state.agreementId || '❌ Not set',
        }, null, 2)}
      </OutputPanel>
    </div>
  );
}
