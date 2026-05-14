"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import MagicRings from "./animations/MagicRings";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 text-center w-full overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0 opacity-50 flex items-center justify-center">
        <div className="w-full h-full max-w-7xl max-h-[1024px]">
          <MagicRings
            color="#58A0B4"
            colorTwo="#FFFFFF"
            ringCount={6}
            speed={1}
            attenuation={20}
            lineThickness={2}
            baseRadius={0.35}
            radiusStep={0.1}
            scaleRate={0.2}
            opacity={1}
            blur={0}
            noiseAmount={0.1}
            rotation={0}
            ringGap={1.5}
            fadeIn={0.7}
            fadeOut={0.5}
            followMouse={false}
            mouseInfluence={0}
            hoverScale={1}
            parallax={0.05}
            clickBurst={false}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 mt-8 relative z-10">
        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, filter: "blur(12px)", y: 15 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-3xl md:text-5xl font-syne tracking-tight text-white"
        >
          <span className="font-bold">Trust</span> shouldn't be based on{" "}
          <span className="font-bold">Words</span>, it should be{" "}
          <span className="font-bold">Proven</span>.
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, filter: "blur(12px)", y: 15 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="text-lg md:text-lg text-gray-300 font-dm-sans max-w-2xl mx-auto leading-relaxed mt-4"
        >
          <span className="underline"> A hyper-performant AI</span> verification
          engine that detects fraud and verifies proof of liveness. <br />{" "}
          Identity verified. Risk scored. Money moved — only when AI clears it
        </motion.p>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(12px)", y: 15 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="flex items-center justify-center gap-4 pt-2"
        >
          <Button
            size="lg"
            className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg font-syne transition-all shadow-lg hover:scale-102"
            onClick={() => (window.location.href = "/docs")}
          >
            Explore Documentation
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
