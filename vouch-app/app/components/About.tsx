"use client";

import { motion } from "framer-motion";
import React from "react";
import {
  ZapOff,
  Wallet,
  ShieldOff,
  Fingerprint,
  KeyRound,
  Receipt,
  Check,
} from "lucide-react";

const About = () => {
  return (
    <section className="w-full py-24 px-8 bg-black relative text-white">
      <div className="max-w-6xl mx-auto space-y-32">
        {/* SECTION 1: THE PROBLEM */}
        <div className="space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="text-sm font-semibold tracking-wider text-red-400 uppercase font-syne">
              Why this exists
            </div>
            <h2 className="text-4xl md:text-5xl font-syne font-bold max-w-xl">
              The Fundamental Trust Gap
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-gray-400 text-lg leading-relaxed font-dm-sans mb-8">
                Today's digital marketplaces suffer from one core issue.
                Platforms have solved the payment rails, but they assume trust.
                Vendors disappear after taking money. Buyers chargeback after
                receiving work. The result? Money moves, but trust is lost.
              </p>
              <ul className="space-y-6 font-dm-sans">
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-red-400 flex-shrink-0">
                    <ZapOff className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-gray-200 mb-1">
                      The Ghost Vendor
                    </strong>
                    <span className="text-gray-400 text-sm">
                      A buyer pays ₦150k to an Instagram vendor. The vendor
                      disappears. No product. No refund. No recourse.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-red-400 flex-shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-gray-200 mb-1">
                      The Disappearing Buyer
                    </strong>
                    <span className="text-gray-400 text-sm">
                      A freelancer delivers a finished site. The client claims
                      it does not meet requirements and vanishes.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-red-400 flex-shrink-0">
                    <ShieldOff className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-gray-200 mb-1">
                      No Proof of Good Faith
                    </strong>
                    <span className="text-gray-400 text-sm">
                      "We have DMs" isn't the same as a programmatic escrow that
                      holds funds until obligations are met.
                    </span>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#0f0f13] border border-gray-800 rounded-xl p-8 font-mono text-sm shadow-2xl"
            >
              <div className="text-gray-500 mb-6">
                // transaction_state.json — dispute filed
              </div>
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-32 text-gray-400">vendor_id</span>
                  <span className="text-red-400">→ null (unverified)</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-gray-400">payment_status</span>
                  <span className="text-red-400">→ "COMPLETED"</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-gray-400">item_delivered</span>
                  <span className="text-red-400">→ false</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-gray-400">escalation</span>
                  <span className="text-red-400">→ active</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-gray-400">refund_method</span>
                  <span className="text-red-400">→ undefined</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-red-500/20 flex gap-3 text-red-400 font-semibold">
                <span>💀</span> Transaction state: LOST
              </div>
            </motion.div>
          </div>
        </div>

        {/* SECTION 2: THE FIX */}
        <div className="space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="text-sm font-semibold tracking-wider text-[#58A0B4] uppercase font-syne">
              The fix
            </div>
            <h2 className="text-4xl md:text-5xl font-syne font-bold max-w-xl">
              Trust as Infrastructure.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-gray-400 text-lg leading-relaxed font-dm-sans mb-8">
                Vouch uses AI-powered fraud analysis, identity verification, and
                Squad APIs to make trust a first-class requirement. We score
                risk, verify who you are, and securely hold funds until everyone
                is happy.
              </p>
              <ul className="space-y-6 font-dm-sans">
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-[#58A0B4] flex-shrink-0">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <span className="text-gray-300 text-sm">
                    Identity verified — real-time liveness checks & face
                    matching
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-[#58A0B4] flex-shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <span className="text-gray-300 text-sm">
                    AI Fraud Engine — intercepts suspicious transactions before
                    they process
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-[#58A0B4] flex-shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-gray-300 text-sm">
                    Squad Vaults — autonomous escrow holding until transaction
                    validates
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-[#58A0B4] flex-shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-gray-300 text-sm">
                    Automated Refunds — disputes route via AI & release logic
                    without human bottlenecks
                  </span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#0f0f13] border border-gray-800 rounded-xl p-8 font-mono text-sm shadow-2xl relative overflow-hidden"
            >
              {/* Decorative accent top */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#58A0B4]" />

              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
                <span className="text-gray-500">VouchReceipt</span>
                <span className="flex items-center gap-1.5 text-[#58A0B4] bg-[#58A0B4]/10 px-2 py-0.5 rounded text-xs font-semibold">
                  <span>verified</span>
                  <Check className="w-3 h-3 stroke-[2.5px]" />
                </span>
              </div>

              <div className="space-y-4 text-gray-300">
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"tx_id":</span>{" "}
                  <span>"vouch_91x...44c1"</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"seller":</span>{" "}
                  <span>"verified_vendor"</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"fraudRisk":</span>{" "}
                  <span className="text-[#58A0B4]">"0.02"</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"escrow":</span>{" "}
                  <span className="text-purple-400">"LOCKED"</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"amount":</span>{" "}
                  <span className="text-white">₦ 150,000</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"conditions":</span>{" "}
                  <span>"fulfilled"</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-gray-500">"release":</span>{" "}
                  <span className="text-[#58A0B4]">"COMPLETED"</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
