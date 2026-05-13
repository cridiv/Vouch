"use client";

import React from "react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center w-full">
      <div className="max-w-5xl mx-auto space-y-8 mt-10">
        {/* Main Heading */}
        <h1 className="text-3xl md:text-5xl font-syne tracking-tight text-white">
          <span className="font-bold">Trust</span> shouldn't be based on{" "}
          <span className="font-bold">Words</span>, it should be{" "}
          <span className="font-bold">Proven</span>.
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-gray-300 font-dm-sans max-w-2xl mx-auto leading-relaxed mt-4">
          <span className="underline"> A hyper-performant AI</span> verification
          engine that detects fraud and verifies proof of live
        </p>

        {/* Call to Action */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            size="lg"
            className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg font-syne transition-all shadow-lg hover:scale-102"
            onClick={() => (window.location.href = "/docs")}
          >
            Explore Documentation
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
