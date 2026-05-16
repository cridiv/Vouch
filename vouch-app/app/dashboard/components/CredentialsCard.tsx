"use client";
import { Copy, Key } from "lucide-react";
import { useState, useEffect } from "react";

export function CredentialsCard({ provisionData }: { provisionData: any }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('vouch_api_key');
    setRawKey(stored);
  }, []);

  const copyToClipboard = (text: string, type: "id" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full mt-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between rounded-3xl bg-white/[0.04] border border-white/10 px-6 py-5 w-full">
        <p className="text-sm md:text-md flex flex-col md:flex-row gap-2 md:gap-4 md:items-center w-full">
          <span className="text-gray-400 font-syne text-lg whitespace-nowrap">
            Project / Dev ID:{" "}
          </span>
          <span className="font-mono text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-sm overflow-hidden text-ellipsis">
            {provisionData?.developerId || "Loading..."}
          </span>
        </p>
        <button
          onClick={() =>
            copyToClipboard(provisionData?.developerId || "", "id")
          }
          className="inline-flex w-full md:w-auto items-center justify-center whitespace-nowrap bg-transparent text-white border border-white/20 h-10 gap-2 rounded-xl px-5 text-sm font-mono hover:bg-white/10 transition-colors shrink-0"
        >
          {copiedId ? "Copied!" : "Copy ID"}
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between rounded-3xl bg-[#58A0B4]/10 border border-[#58A0B4]/20 px-6 py-5 w-full">
        <p className="text-sm md:text-md flex flex-col md:flex-row gap-2 md:gap-4 md:items-center w-full">
          <span className="text-gray-400 font-syne text-lg whitespace-nowrap">
            Secret API Key:{" "}
          </span>
          {rawKey ? (
            <span className="font-mono text-[#58A0B4] bg-black/40 px-3 py-1.5 rounded-lg border border-[#58A0B4]/30 text-sm tracking-widest overflow-hidden text-ellipsis">
              {rawKey}
            </span>
          ) : (
            <span className="font-mono text-[#58A0B4] bg-black/40 px-3 py-1.5 rounded-lg border border-[#58A0B4]/30 text-sm tracking-widest overflow-hidden text-ellipsis">
              {provisionData?.apiKey?.rawKey
                ? "••••••••••••••••" + provisionData.apiKey.rawKey.slice(-6)
                : "Loading..."}
            </span>
          )}
        </p>
        <button
          onClick={() =>
            copyToClipboard(rawKey || provisionData?.apiKey?.rawKey || "", "key")
          }
          className="inline-flex w-full md:w-auto items-center justify-center whitespace-nowrap bg-[#58A0B4]/20 text-[#58A0B4] shadow-[0_0_0_1px_rgba(88,160,180,0.5)] h-10 gap-2 rounded-xl px-5 text-sm font-mono hover:bg-[#58A0B4]/30 transition-colors shrink-0"
        >
          {copiedKey ? "Copied Key!" : "Copy Key"}
          <Key className="w-3.5 h-3.5" />
        </button>
      </div>

      {rawKey && (
        <div className="px-6 py-2">
          <p className="text-xs text-amber-400 mb-2">
            ⚠ Save this key now. Once you clear your browser it cannot be shown again.
          </p>
          <button 
            onClick={() => {
              localStorage.removeItem('vouch_api_key');
              setRawKey(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-400 underline transition-colors"
          >
            I have saved this key — hide it
          </button>
        </div>
      )}

      {!rawKey && (
        <div className="px-6 py-2">
          <p className="text-xs text-gray-400">
            Your API key was shown once and is no longer visible for security reasons.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            If you need a new key, revoke this one and generate a new one below.
          </p>
          <button className="text-xs text-[#58A0B4] hover:underline mt-2">Generate new API key</button>
        </div>
      )}
    </div>
  );
}
