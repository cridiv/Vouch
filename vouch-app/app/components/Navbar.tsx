"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="w-full font-syne">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 3-column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 h-18 items-center text-sm">
          {/* Left: Brand */}
          <div className="flex items-center gap-4 justify-start">
            <Link href="/" className="font-bold text-xl tracking-tight">
              {`{`} vouch{` }`}
              <span className="text-[#58a0b4] text-3xl">.</span>sdk
            </Link>
          </div>

          {/* Middle: Main Navigation */}
          <div className="hidden font-dm-sans md:flex items-center justify-center gap-10 text-gray-300 font-lg">
            {/* <Link href="/methods" className="hover:text-black transition">
              Methods
            </Link> */}
            <Link href="/quickstart" className="hover:text-gray-100 transition">
              Quickstart
            </Link>
            <Link
              href="/integrations"
              className="hover:text-gray-100 transition"
            >
              Integrations
            </Link>
            <Link href="/stack" className="hover:text-gray-100 transition">
              Stack
            </Link>
          </div>

          {/* Right: Docs & Call-to-Action */}
          <div className="flex items-center justify-end gap-5 text-gray-600 font-medium">
            <Button
              onClick={() => (window.location.href = "/docs")}
              className="hover:text-black transition hidden sm:block"
            >
              Docs
            </Button>
            <Button
              onClick={() => (window.location.href = "/github")}
              className="hover:text-black transition hidden sm:block"
            >
              GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/demos")}
              className="bg-black text-white px-4 py-2 rounded-md transition"
            >
              View demo
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
