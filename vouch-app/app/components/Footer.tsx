import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="relative w-full pt-16 pb-10 px-8 bg-black text-white">
      {/* Gradient Top Border */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-50" />

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 justify-between items-start">
        {/* Brand Section */}
        <div>
          <div className="font-syne text-xl font-bold tracking-tight">
            {`{`} vouch {`}`}
            <span className="text-[#58A0B4]">.</span>sdk
          </div>
          <div className="text-sm text-gray-400 mt-2 leading-relaxed font-dm-sans">
            The absolute trust engine.
            <br />
            Identity, fraud, and escrow infrastructure.
          </div>
        </div>

        {/* Links Section */}
        <div className="flex gap-16 text-sm font-dm-sans">
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1">
              Docs
            </div>
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors"
            >
              API Methods
            </Link>
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Quickstart
            </Link>
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Integrations
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1">
              Project
            </div>
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors"
            >
              The Stack
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-gray-800 text-xs text-gray-500 font-dm-sans flex flex-col sm:flex-row justify-between gap-2">
        <span>© 2026 Vouch · MIT License</span>
        <span>Built for absolute trust · Squad Hackathon</span>
      </div>
    </footer>
  );
};

export default Footer;
