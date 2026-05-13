import { Button } from "@/components/ui/button";
import React from "react";

const CtaCard = () => {
  return (
    <section className="w-full py-32 px-8 bg-black relative text-white border-t border-b border-white/10">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-10">
        <h2 className="text-5xl md:text-7xl font-syne font-bold tracking-tight">
          Build with Vouch Now
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 mt-4">
          <Button
            size="lg"
            className="bg-white text-black hover:bg-gray-200 px-10 py-7 text-xl font-syne transition-all hover:scale-102"
          >
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-transparent text-white border-white/20 hover:bg-white/10 px-10 py-7 text-xl font-syne transition-all hover:scale-102"
          >
            View Docs
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CtaCard;
