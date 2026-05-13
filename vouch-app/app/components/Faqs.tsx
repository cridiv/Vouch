"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Vouch?",
    answer:
      "Vouch is a trust infrastructure SDK—built from the ground up for marketplaces, peer-to-peer platforms, and escrow services. It combines Identity Verification, a real-time Fraud Engine, and secure Escrow via Squad Rails to ensure money never moves until trust is fully proven.",
  },
  {
    question: "How fast is the Fraud Engine?",
    answer:
      "Sub-second analysis. The Fraud Engine evaluates IP reputation, behavioral signals, and network anomalies in real-time, actively scoring transaction risk before a Squad Virtual Account is ever generated or funds are moved.",
  },
  {
    question: "Is Vouch easy to integrate?",
    answer:
      "Yes. Drop in our React and Node SDKs without overhauling your existing backend. Vouch gives you a clean API surface for identity flows, fraud checks, and escrow vaults, abstracting away the complex compliance and banking integration logic.",
  },
  {
    question: "What can I build with Vouch?",
    answer:
      "Vouch's performance and native capabilities open up application categories that require absolute trust. Peer-to-peer marketplaces, gig-economy platforms with milestone payouts, high-value asset trading, and any application where the buyer needs assurance before payment and the seller needs a guarantee of funds.",
  },
];

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState<number | null>();

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full py-32 px-8 bg-black relative text-white border-t border-white/10">
      <div className="max-w-4xl mx-auto flex flex-col gap-16">
        <div className="w-full space-y-4 text-center">
          <h2 className="text-5xl font-syne font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="w-full flex flex-col">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="border-b border-gray-800 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="flex w-full items-center justify-between py-6 text-left transition-all outline-none hover:text-gray-300"
                >
                  <h3 className="text-2xl font-syne font-semibold">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-6 h-6 text-gray-500" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-lg font-dm-sans text-gray-400 pb-8 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Faqs;
