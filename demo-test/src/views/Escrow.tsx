import { useState, useEffect } from 'react';
import { OutputPanel } from '../components/OutputPanel';
import { storage } from '../lib/storage';
import type { Milestone } from '../lib/types';

export function Escrow() {
  const [state, setState] = useState({
    apiKey: null as string | null,
    developerId: null as string | null,
    buyerId: null as string | null,
    sellerId: null as string | null,
    agreementId: null as string | null,
    backendUrl: 'http://localhost:5000',
  });
  
  const [totalAmount, setTotalAmount] = useState(150000);
  const [m1Title, setM1Title] = useState('Design Phase');
  const [m1Amount, setM1Amount] = useState(50000);
  const [m2Title, setM2Title] = useState('Development Phase');
  const [m2Amount, setM2Amount] = useState(100000);
  
  const [agreementOutput, setAgreementOutput] = useState('Waiting...');
  const [fraudOutput, setFraudOutput] = useState('Create an agreement first...');
  const [paymentOutput, setPaymentOutput] = useState('Complete fraud assessment first...');
  const [confirmOutput, setConfirmOutput] = useState('Fund the escrow first...');
  
  const [agreementVariant, setAgreementVariant] = useState<any>('default');
  const [fraudVariant, setFraudVariant] = useState<any>('default');
  const [paymentVariant, setPaymentVariant] = useState<any>('default');
  const [confirmVariant, setConfirmVariant] = useState<any>('default');
  
  const [simulateVpn, setSimulateVpn] = useState(false);
  const [simulateTravel, setSimulateTravel] = useState(false);
  
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  
  const [assessBtnEnabled, setAssessBtnEnabled] = useState(false);
  const [paymentBtnEnabled, setPaymentBtnEnabled] = useState(false);
  const [confirmBtnsEnabled, setConfirmBtnsEnabled] = useState(false);
  
  const [sellerAccount, setSellerAccount] = useState('0123456789');
  const [sellerBankCode, setSellerBankCode] = useState('000013');
  const [txRef, setTxRef] = useState('TX-TEST-001');

  useEffect(() => {
    const allState = storage.getAll();
    setState(allState);
    if (allState.agreementId) {
      setAgreementId(allState.agreementId);
      setAssessBtnEnabled(true);
    }
    setTxRef(`TX-TEST-${Date.now()}`);

    const interval = setInterval(() => {
      const current = storage.getAll();
      setState(current);
      if (current.agreementId && !agreementId) {
        setAgreementId(current.agreementId);
        setAssessBtnEnabled(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const createAgreement = async () => {
    setAgreementOutput('⏳ Creating agreement...');
    setAgreementVariant('default');

    if (m1Amount + m2Amount !== totalAmount) {
      setAgreementOutput(`❌ Milestone amounts (${m1Amount + m2Amount}) must equal total (${totalAmount})`);
      setAgreementVariant('error');
      return;
    }

    try {
      const response = await fetch(`${state.backendUrl}/v1/escrow/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': state.apiKey! },
        body: JSON.stringify({
          buyerExternalId: state.buyerId,
          sellerExternalId: state.sellerId,
          totalAmount,
          milestones: [
            { title: m1Title, amount: m1Amount },
            { title: m2Title, amount: m2Amount },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || JSON.stringify(data));

      setAgreementId(data.agreementId);
      setMilestones(data.milestones);
      storage.setAgreementId(data.agreementId);
      setAssessBtnEnabled(true);
      
      if (data.milestones.length > 0) {
        setSelectedMilestone(data.milestones[0].id);
      }

      setAgreementOutput(
        `✅ Agreement Created!\n\n` +
        `Agreement ID:     ${data.agreementId}\n` +
        `Status:           ${data.status}\n` +
        `Virtual Account:  ${data.squadVirtualAccountNo}\n` +
        `Bank:             ${data.squadBank}\n` +
        `Total:            ₦${data.totalAmount.toLocaleString()}\n\n` +
        `Milestones:\n` +
        data.milestones.map((m: Milestone) => `  • ${m.title}: ₦${m.amount.toLocaleString()}`).join('\n') +
        `\n\n→ Next: Run Fraud Assessment`
      );
      setAgreementVariant('success');
    } catch (err: any) {
      setAgreementOutput(`❌ Error: ${err.message}`);
      setAgreementVariant('error');
    }
  };

  const assessFraud = async () => {
    setFraudOutput('⏳ Running fraud assessment...');
    setFraudVariant('default');

    try {
      const response = await fetch(`${state.backendUrl}/v1/escrow/agreements/${agreementId}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': state.apiKey! },
        body: JSON.stringify({
          externalUserId: state.buyerId,
          deviceFingerprint: 'test-harness-fp-buyer',
          transactionAmount: totalAmount,
          simulate_vpn: simulateVpn,
          simulate_impossible_travel: simulateTravel,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || JSON.stringify(data));

      const flag = data.flag;
      setFraudVariant(flag.toLowerCase());

      if (flag === 'RED') {
        setFraudOutput(
          `🚨 TRANSACTION BLOCKED — RED FLAG\n\n` +
          `Score:    ${data.score}/100\n` +
          `Flag:     ${flag}\n` +
          `Signals:  ${(data.triggeredSignals || []).join(', ')}\n\n` +
          `Escrow has been FROZEN.\n` +
          `Virtual account number withheld.\n` +
          `${data.message || ''}`
        );
      } else if (flag === 'AMBER') {
        setFraudOutput(
          `⚠️ ELEVATED RISK — AMBER FLAG\n\n` +
          `Score:          ${data.score}/100\n` +
          `Flag:           ${flag}\n` +
          `Signals:        ${(data.triggeredSignals || []).join(', ') || 'None'}\n\n` +
          `Additional verification is required before payment can proceed.\n` +
          `Virtual account number withheld until verification is completed.\n\n` +
          `${data.message || ''}`
        );
      } else {
        setFraudOutput(
          `✅ FRAUD CHECK GREEN — Payment Cleared\n\n` +
          `Score:          ${data.score}/100\n` +
          `Flag:           ${flag}\n` +
          `Signals:        ${(data.triggeredSignals || []).join(', ') || 'None'}\n\n` +
          `Virtual Account: ${data.squadVirtualAccountNo}\n` +
          `Bank:            ${data.squadBank}\n` +
          `Amount:          ₦${data.amount?.toLocaleString()}\n\n` +
          `→ Buyer would now transfer to the virtual account\n` +
          `→ Click "Simulate Payment" to proceed`
        );
        setPaymentBtnEnabled(true);
      }
    } catch (err: any) {
      setFraudOutput(`❌ Error: ${err.message}`);
      setFraudVariant('error');
    }
  };

  const simulatePayment = async () => {
    setPaymentOutput('⏳ Simulating Squad webhook...');
    setPaymentVariant('default');

    try {
      const response = await fetch(`${state.backendUrl}/v1/escrow/agreements/${agreementId}/simulate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': state.apiKey! },
        body: JSON.stringify({ transactionRef: txRef }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || JSON.stringify(data));

      setConfirmBtnsEnabled(true);
      setPaymentOutput(
        `✅ Payment Simulated — Escrow FUNDED\n\n` +
        `Transaction Ref: ${txRef}\n` +
        `Agreement Status: ${data.status}\n\n` +
        `→ Both parties can now confirm milestones`
      );
      setPaymentVariant('success');
    } catch (err: any) {
      setPaymentOutput(`❌ Error: ${err.message}\n\nMake sure you have added the simulate-payment endpoint`);
      setPaymentVariant('error');
    }
  };

  const confirmMilestone = async (role: 'buyer' | 'seller') => {
    if (!selectedMilestone) {
      setConfirmOutput('❌ Select a milestone first');
      setConfirmVariant('error');
      return;
    }

    setConfirmOutput(`⏳ ${role} confirming milestone...`);
    setConfirmVariant('default');

    try {
      const body: any = {
        externalUserId: role === 'buyer' ? state.buyerId : state.sellerId,
      };

      if (role === 'seller') {
        body.sellerAccountNumber = sellerAccount;
        body.sellerBankCode = sellerBankCode;
      }

      const response = await fetch(
        `${state.backendUrl}/v1/escrow/agreements/${agreementId}/milestones/${selectedMilestone}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': state.apiKey! },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || JSON.stringify(data));

      const bothConfirmed = data.buyerConfirmed && data.sellerConfirmed;
      setConfirmVariant(bothConfirmed ? 'success' : 'warning');
      
      setConfirmOutput(
        `${bothConfirmed ? '✅ BOTH CONFIRMED — Disbursement Triggered!' : `⏳ ${role.toUpperCase()} confirmed — waiting for ${role === 'buyer' ? 'seller' : 'buyer'}`}\n\n` +
        `Milestone:       ${data.title}\n` +
        `Amount:          ₦${data.amount?.toLocaleString()}\n` +
        `Buyer Confirmed: ${data.buyerConfirmed ? '✅' : '❌'}\n` +
        `Seller Confirmed: ${data.sellerConfirmed ? '✅' : '❌'}\n` +
        `Status:          ${data.status}\n` +
        (data.squadTransactionId ? `Squad TX ID:     ${data.squadTransactionId}\n` : '') +
        (data.disbursedAt ? `Disbursed At:    ${data.disbursedAt}` : '')
      );
    } catch (err: any) {
      setConfirmOutput(`❌ Error: ${err.message}`);
      setConfirmVariant('error');
    }
  };

  if (!state.apiKey) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-500 mb-6">Step 3 — Escrow Flow</h1>
        <OutputPanel variant="error">❌ No API key. Go to Setup first.</OutputPanel>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-500 mb-6">Step 3 — Escrow Flow</h1>

      <OutputPanel variant="success">
        ✅ API Key: {state.apiKey.slice(0, 20)}...{'\n'}
        Buyer:  {state.buyerId}{'\n'}
        Seller: {state.sellerId}{'\n'}
        {state.agreementId ? `Agreement: ${state.agreementId} (from previous session)` : 'No active agreement'}
      </OutputPanel>

      {/* CREATE AGREEMENT */}
      <div className="border border-gray-800 p-4 rounded mt-6">
        <h3 className="text-sm font-bold text-blue-400 mb-4">📋 3.1 — Create Agreement</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Total Amount (NGN)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Milestone 1 Title</label>
              <input
                value={m1Title}
                onChange={(e) => setM1Title(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Milestone 1 Amount</label>
              <input
                type="number"
                value={m1Amount}
                onChange={(e) => setM1Amount(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Milestone 2 Title</label>
              <input
                value={m2Title}
                onChange={(e) => setM2Title(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Milestone 2 Amount</label>
              <input
                type="number"
                value={m2Amount}
                onChange={(e) => setM2Amount(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
              />
            </div>
          </div>

          <button
            onClick={async () => {
              setAgreementOutput('⏳ Marking both buyer & seller as verified...');
              setAgreementVariant('default');
              try {
                for (const userId of [state.buyerId, state.sellerId]) {
                  const res = await fetch(`${state.backendUrl}/v1/developer/mark-verified`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': state.apiKey! },
                    body: JSON.stringify({ externalUserId: userId }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || 'Failed to mark verified');
                  }
                }
                setAgreementOutput('✅ Both buyer & seller marked as verified!\n\n→ You can now create the agreement.');
                setAgreementVariant('success');
              } catch (err: any) {
                setAgreementOutput(`❌ Error: ${err.message}`);
                setAgreementVariant('error');
              }
            }}
            className="w-full px-4 py-2 bg-green-700 hover:bg-green-600 rounded font-mono text-sm cursor-pointer border border-green-500"
          >
            ⚡ Mark Both Buyer & Seller as Verified (Skip Identity)
          </button>

          <button
            onClick={createAgreement}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm cursor-pointer"
          >
            Create Agreement
          </button>

          <OutputPanel variant={agreementVariant}>{agreementOutput}</OutputPanel>
        </div>
      </div>

      {/* FRAUD ASSESSMENT */}
      <div className="border border-gray-800 p-4 rounded mt-6">
        <h3 className="text-sm font-bold text-blue-400 mb-4">🔍 3.2 — Pre-Payment Fraud Assessment</h3>

        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={simulateVpn}
              onChange={(e) => setSimulateVpn(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">🔴 Simulate VPN</span>
            <span className={`text-xs ml-auto ${simulateVpn ? 'text-red-400' : 'text-gray-500'}`}>
              {simulateVpn ? '🔴 ON — This will return RED' : 'OFF'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={simulateTravel}
              onChange={(e) => setSimulateTravel(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">🔴 Simulate Impossible Travel</span>
            <span className={`text-xs ml-auto ${simulateTravel ? 'text-red-400' : 'text-gray-500'}`}>
              {simulateTravel ? '🔴 ON — This will return RED' : 'OFF'}
            </span>
          </label>
        </div>

        <button
          onClick={assessFraud}
          disabled={!assessBtnEnabled}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm disabled:bg-gray-700 disabled:cursor-not-allowed cursor-pointer"
        >
          Run Fraud Assessment
        </button>

        <OutputPanel variant={fraudVariant}>{fraudOutput}</OutputPanel>
      </div>

      {/* SIMULATE PAYMENT */}
      <div className="border border-gray-800 p-4 rounded mt-6">
        <h3 className="text-sm font-bold text-blue-400 mb-4">💳 3.3 — Simulate Payment (Squad Webhook)</h3>
        <p className="text-xs text-gray-500 mb-3">
          In real flow: buyer transfers to the Squad virtual account.<br />
          Here: we manually trigger the webhook to simulate payment received.
        </p>

        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Transaction Reference (auto-generated)</label>
          <input
            value={txRef}
            readOnly
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono text-gray-500"
          />
        </div>

        <button
          onClick={simulatePayment}
          disabled={!paymentBtnEnabled}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm disabled:bg-gray-700 disabled:cursor-not-allowed cursor-pointer"
        >
          Simulate Squad Webhook (Payment Received)
        </button>

        <OutputPanel variant={paymentVariant}>{paymentOutput}</OutputPanel>
      </div>

      {/* CONFIRM MILESTONE */}
      <div className="border border-gray-800 p-4 rounded mt-6">
        <h3 className="text-sm font-bold text-blue-400 mb-4">✅ 3.4 — Confirm Milestone</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Milestone to Confirm</label>
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
            >
              {milestones.length === 0 ? (
                <option value="">Create agreement first...</option>
              ) : (
                milestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title} — ₦{m.amount.toLocaleString()}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Seller Bank Account (for disbursement)</label>
            <input
              value={sellerAccount}
              onChange={(e) => setSellerAccount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Seller Bank Code</label>
            <input
              value={sellerBankCode}
              onChange={(e) => setSellerBankCode(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => confirmMilestone('buyer')}
              disabled={!confirmBtnsEnabled}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm disabled:bg-gray-700 disabled:cursor-not-allowed cursor-pointer"
            >
              ✅ Buyer Confirms
            </button>
            <button
              onClick={() => confirmMilestone('seller')}
              disabled={!confirmBtnsEnabled}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-mono text-sm disabled:bg-gray-700 disabled:cursor-not-allowed cursor-pointer"
            >
              ✅ Seller Confirms
            </button>
          </div>

          <OutputPanel variant={confirmVariant}>{confirmOutput}</OutputPanel>
        </div>
      </div>
    </div>
  );
}
