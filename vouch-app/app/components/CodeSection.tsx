"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import React from "react";
import { motion } from "framer-motion";
import { Parallax } from "react-scroll-parallax";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const line = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

const CodeSection = () => {
  return (
    <section className="w-full py-24 px-8 bg-black overflow-hidden relative">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Text Content */}
        <div className="space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-3xl md:text-5xl font-syne font-bold text-white tracking-tight"
          >
            Integrate with ease.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-lg text-gray-400 font-dm-sans leading-relaxed"
          >
            Our powerful SDK allows you to verify identity and detect fraud with
            just a few lines of code. Plug it directly into your existing
            infrastructure and start securing your platform instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <Button className="font-syne px-8 py-6 text-lg mt-4 pl-8">
              Try Now <ChevronRight />
            </Button>
          </motion.div>
        </div>

        {/* Right Column: Code Block */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="bg-[#0b0b0f] rounded-xl border border-gray-800 shadow-2xl p-6 overflow-hidden relative z-10"
        >
          {/* Mac-like Window Controls */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>

            <p className="font-dm-sans text-sm text-gray-400">agent.ts</p>
          </div>

          {/* Actual Code */}
          <motion.pre
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="font-['JetBrains_Mono'] text-sm md:text-base leading-relaxed overflow-x-auto"
          >
            <code className="text-gray-300">
              <motion.div variants={line}>
                <span className="text-purple-400">import</span> {"{ Vouch }"}{" "}
                <span className="text-purple-400">from</span>{" "}
                <span className="text-green-400">'@vouch/sdk'</span>;
              </motion.div>
              <motion.div variants={line} className="h-6" />
              <motion.div variants={line}>
                <span className="text-purple-400">const</span> vouch ={" "}
                <span className="text-purple-400">new</span>{" "}
                <span className="text-yellow-200">Vouch</span>({`{`}
              </motion.div>
              <motion.div variants={line}>
                {"  "}apiKey:{" "}
                <span className="text-green-400">'vo_live_123456789'</span>
              </motion.div>
              <motion.div variants={line}>{`}`});</motion.div>
              <motion.div variants={line} className="h-6" />
              <motion.div variants={line} className="text-gray-500">
                {"// Assess fraud risk instantly"}
              </motion.div>
              <motion.div variants={line}>
                <span className="text-purple-400">const</span> riskResult ={" "}
                <span className="text-purple-400">await</span> vouch.fraud.
                <span className="text-blue-400">assess</span>({`{`}
              </motion.div>
              <motion.div variants={line}>
                {"  "}deviceId: fingerprint,
              </motion.div>
              <motion.div variants={line}>
                {"  "}ipAddress:{" "}
                <span className="text-green-400">'192.168.1.1'</span>
              </motion.div>
              <motion.div variants={line}>{`}`});</motion.div>
              <motion.div variants={line} className="h-6" />
              <motion.div variants={line}>
                <span className="text-purple-400">if</span> (riskResult.score{" "}
                {`>`} <span className="text-orange-400">0.8</span>) {`{`}
              </motion.div>
              <motion.div variants={line}>
                {"  "}
                <span className="text-blue-400">blockTransaction</span>();
              </motion.div>
              <motion.div variants={line}>{`}`}</motion.div>
            </code>
          </motion.pre>
        </motion.div>
      </div>
    </section>
  );
};

export default CodeSection;
