"use client";

import { motion } from "framer-motion";
import React from "react";
import VouchIdentitySVG from "./IdentityVerification";

const Features = () => {
  return (
    <section className="w-full py-24 px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-8 w-full">
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-[calc(50%-1rem)] lg:flex-1 lg:min-w-0"
          >
            <div className="bg-[#0b0b0f] border border-gray-800 rounded-2xl flex flex-col gap-6 p-8 group h-full overflow-hidden transition-all hover:bg-[#121217]">
              <img
                alt=" Identity Verification "
                loading="lazy"
                width="420"
                height="420"
                className="w-full h-auto object-contain grayscale transition-[filter] duration-300 group-hover:grayscale-0"
                src="https://front-page-v2.cdn.somnia.network/media/on-chain-event-trigger.svg"
              />
              <div className="space-y-4 mt-auto">
                <h4 className="font-syne text-xl md:text-2xl font-semibold text-white">
                  Identity Verification
                </h4>
                <p className="font-dm-sans text-gray-400 leading-relaxed text-sm md:text-base">
                  Verify users reliably before they join any agreement using
                  robust computer vision, identity document validation, and AI
                  liveness detection.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full md:w-[calc(50%-1rem)] lg:flex-1 lg:min-w-0"
          >
            <div className="bg-[#0b0b0f] border border-gray-800 rounded-2xl flex flex-col gap-6 p-8 group h-full overflow-hidden transition-all hover:bg-[#121217]">
              <img
                alt="Fraud Detection"
                loading="lazy"
                width="420"
                height="420"
                className="w-full h-auto object-contain grayscale transition-[filter] duration-300 group-hover:grayscale-0"
                src="https://front-page-v2.cdn.somnia.network/media/applicaton-that-responds-in-real-time.svg"
              />
              <div className="space-y-4 mt-auto">
                <h4 className="font-syne text-xl md:text-2xl font-semibold text-white">
                  Fraud Detection Engine
                </h4>
                <p className="font-dm-sans text-gray-400 leading-relaxed text-sm md:text-base">
                  Score transaction risk instantly. Our AI analyzes behavioral
                  signals, device fingerprints, and payment context before any
                  money moves.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full md:w-[calc(50%-1rem)] lg:flex-1 lg:min-w-0"
          >
            <div className="bg-[#0b0b0f] border border-gray-800 rounded-2xl flex flex-col gap-6 p-8 group h-full overflow-hidden transition-all hover:bg-[#121217]">
              <img
                alt=" Escrow & Squad Rails"
                loading="lazy"
                width="420"
                height="420"
                className="w-full h-auto object-contain grayscale transition-[filter] duration-300 group-hover:grayscale-0"
                src="https://front-page-v2.cdn.somnia.network/media/agents-query-apis-on-chain.svg"
              />
              <div className="space-y-4 mt-auto">
                <h4 className="font-syne text-xl md:text-2xl font-semibold text-white">
                  Escrow & Squad Rails
                </h4>
                <p className="font-dm-sans text-gray-400 leading-relaxed text-sm md:text-base">
                  Secure funds automatically using Squad virtual accounts.
                  Disbursements are strictly gated by AI risk clearance and
                  confirmed deliveries.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Features;
