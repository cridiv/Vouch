"use client";

import { motion } from "framer-motion";
import React from "react";
import { Zap, Lock, ScanLine, Wallet } from "lucide-react";

const HowItWorks = () => {
  return (
    <section className="w-full py-24 px-8 bg-black relative text-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-semibold tracking-wider text-[#58A0B4] uppercase font-syne mb-16"
        >
          How it works — four flows, one API
        </motion.div>

        {/* FLOW 01 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-24 pb-24 border-b border-gray-800/60 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-[#58A0B4] font-syne text-xl font-bold mb-4 tracking-widest">
              01
            </div>
            <h3 className="text-3xl lg:text-4xl font-syne font-bold mb-6">
              The Identity Layer
            </h3>
            <p className="text-gray-400 font-dm-sans leading-relaxed text-base lg:text-lg">
              Verify the person before they can join any agreement. We match
              government IDs with live selfies using computer vision. No
              deepfakes, no ghost vendors.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0f0f13] border border-gray-800 rounded-xl overflow-hidden font-mono text-sm shadow-2xl w-full"
          >
            <div className="bg-[#1a1a24] px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
              <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
              <span className="text-xs text-gray-500 ml-2">identity.ts</span>
            </div>
            <div className="p-6 text-gray-300 leading-relaxed font-mono">
              <div>
                <span className="text-purple-400">const</span> result ={" "}
                <span className="text-purple-400">await</span> sdk.identity.
                <span className="text-blue-400">verify</span>({`{`}
              </div>
              <div className="pl-4">
                document:{" "}
                <span className="text-green-300">'"passport_front.jpg"'</span>,
              </div>
              <div className="pl-4">selfieImage: streamData</div>
              <div>{"});"}</div>
              <div className="text-gray-500 mt-4">// Returns:</div>
              <div className="text-gray-500">// {`"match_score"`}: 98.5</div>
              <div className="text-gray-500">// {`"liveness"`}: true</div>
              <div className="text-gray-500">// {`"status"`}: "VERIFIED"</div>
            </div>
          </motion.div>
        </div>

        {/* FLOW 02 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-24 pb-24 border-b border-gray-800/60 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1 bg-[#0f0f13] border border-gray-800 rounded-xl overflow-hidden font-mono text-sm shadow-2xl w-full"
          >
            <div className="bg-[#1a1a24] px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
              <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
              <span className="text-xs text-gray-500 ml-2">fraud.ts</span>
            </div>
            <div className="p-6 text-gray-300 leading-relaxed font-mono">
              <div className="text-gray-500 mb-2">
                // Pre-payment risk assessment
              </div>
              <div>
                <span className="text-purple-400">const</span> risk ={" "}
                <span className="text-purple-400">await</span> sdk.fraud.
                <span className="text-blue-400">assessStatus</span>({`{`}
              </div>
              <div className="pl-4">
                buyerId: <span className="text-green-300">'"usr_9x..."'</span>,
              </div>
              <div className="pl-4">
                vendorId: <span className="text-green-300">'"ven_4a..."'</span>,
              </div>
              <div className="pl-4">
                amount: <span className="text-orange-300">150000</span>
              </div>
              <div>{"});"}</div>
              <div className="text-gray-500 mt-4">
                // Engine evaluates context:
              </div>
              <div>
                <span className="text-gray-400">✓ IP Reputation checked</span>
              </div>
              <div>
                <span className="text-gray-400">
                  ✓ Behavioral anomalies cleared
                </span>
              </div>
              <div className="text-gray-500 mt-2">
                // riskScore: 0.02, decision: "GREEN"
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="text-[#58A0B4] font-syne text-xl font-bold mb-4 tracking-widest">
              02
            </div>
            <h3 className="text-3xl lg:text-4xl font-syne font-bold mb-6">
              The Fraud Engine
            </h3>
            <p className="text-gray-400 font-dm-sans leading-relaxed text-base lg:text-lg">
              Our AI scores the transaction risk in real-time. It actively
              analyzes network signals, IP reputation, and behavioral anomalies
              before Squad is ever called.
            </p>
          </motion.div>
        </div>

        {/* FLOW 03 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-24 pb-24 border-b border-gray-800/60 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-[#58A0B4] font-syne text-xl font-bold mb-4 tracking-widest">
              03
            </div>
            <h3 className="text-3xl lg:text-4xl font-syne font-bold mb-6">
              Escrow via Squad Rails
            </h3>
            <p className="text-gray-400 font-dm-sans leading-relaxed text-base lg:text-lg mb-8">
              A secure Squad Virtual Account is generated exclusively for the
              agreement. The buyer pays into this escrow, so money never moves
              directly to an untrusted vendor.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm font-dm-sans text-gray-400">
                <div className="text-gray-900 bg-[#58A0B4] p-1.5">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <span>
                  Funds firmly locked. Vendor sees confirmation but cannot
                  access cash.
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm font-dm-sans text-gray-400">
                <div className="text-gray-900 bg-[#58A0B4] p-1.5">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span>
                  Real-time webhook sync guarantees instant UI updates.
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm font-dm-sans text-gray-400">
                <div className="text-gray-900 bg-[#58A0B4] p-1.5">
                  <ScanLine className="w-4 h-4 text-white" />
                </div>
                <span>
                  Webhook data loops back into fraud engine for context.
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0f0f13] border border-gray-800 rounded-xl overflow-hidden font-mono text-sm shadow-2xl w-full"
          >
            <div className="bg-[#1a1a24] px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
              <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
              <span className="text-xs text-gray-500 ml-2">escrow.ts</span>
            </div>
            <div className="p-6 text-gray-300 leading-relaxed font-mono">
              <div className="text-gray-500 mb-2">
                // Generate vault when agreement starts
              </div>
              <div>
                <span className="text-purple-400">const</span> vault ={" "}
                <span className="text-purple-400">await</span> sdk.escrow.
                <span className="text-blue-400">createVault</span>({`{`}
              </div>
              <div className="pl-4">
                agreementId: <span className="text-green-300">'"ag_77b2"'</span>
              </div>
              <div>{"});"}</div>
              <div className="text-gray-500 mt-4">// Squad API returns:</div>
              <div className="text-gray-500">
                // {`"virtualAccount"`}: "9922334455"
              </div>
              <div className="text-gray-500">// {`"bankName"`}: "GTBank"</div>
              <div className="text-gray-500">
                // {`"status"`}: "AWAITING_FUNDS"
              </div>
              <div className="text-orange-300 mt-2">
                ⚠ Waiting on buyer transfer...
              </div>
            </div>
          </motion.div>
        </div>

        {/* FLOW 04 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1 bg-[#0f0f13] border border-gray-800 rounded-xl overflow-hidden font-mono text-sm shadow-2xl w-full"
          >
            <div className="bg-[#1a1a24] px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
              <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
              <span className="text-xs text-gray-500 ml-2">release.ts</span>
            </div>
            <div className="p-6 text-gray-300 leading-relaxed font-mono">
              <div className="text-gray-500 mb-2">
                // Buyer confirms receipt. Run final check.
              </div>
              <div>
                <span className="text-purple-400">const</span> tx ={" "}
                <span className="text-purple-400">await</span> sdk.escrow.
                <span className="text-blue-400">disburse</span>({`{`}
              </div>
              <div className="pl-4">
                agreementId: <span className="text-green-300">'"ag_77b2"'</span>
                ,
              </div>
              <div className="pl-4">
                amount: <span className="text-orange-300">150000</span>
              </div>
              <div>{"});"}</div>
              <div className="mt-4">
                <span className="text-gray-400">
                  ✓ Generating Squad Payment Link...
                </span>
                <br />
                <span className="text-gray-400">
                  ✓ Executing Disbursement...
                </span>
              </div>
              <div className="text-gray-500 mt-4">
                // Returns Squad Audit Record:
              </div>
              <div className="text-gray-500">// {`"txRef"`}: "SQD_abc123"</div>
              <div className="text-gray-500">
                // {`"completedAt"`}: "2026-05-13T14:32:00Z"
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="text-[#58A0B4] font-syne text-xl font-bold mb-4 tracking-widest">
              04
            </div>
            <h3 className="text-3xl lg:text-4xl font-syne font-bold mb-6">
              AI-Cleared Disbursement
            </h3>
            <p className="text-gray-400 font-dm-sans leading-relaxed text-base lg:text-lg">
              After delivery confirmation and a final fraud check, funds are
              autonomously disbursed using a Squad Payment Link. Every release
              is an immutable audit record tied to a real transaction hash.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
