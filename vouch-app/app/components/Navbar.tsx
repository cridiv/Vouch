"use client";

import Link from "next/link";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="w-full sticky top-0 z-50 backdrop-blur-md font-syne border-b border-white/5 bg-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
        {/* Grid Layout: 2 columns on mobile, 3 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 h-20 items-center text-sm">
          {/* Left: Brand */}
          <div className="flex items-center gap-4 justify-start">
            <Link
              href="/"
              className="font-bold text-xl tracking-tight text-white z-50"
            >
              {`{`} vouch{` }`}
              <span className="text-[#58a0b4] text-3xl">.</span>sdk
            </Link>
          </div>

          {/* Middle: Main Navigation */}
          <div className="hidden font-dm-sans md:flex items-center justify-center gap-10 text-gray-300 font-lg">
            <Link href="/#quickstart" className="hover:text-white transition">
              Quickstart
            </Link>
            <Link href="/#integrations" className="hover:text-white transition">
              Integrations
            </Link>
            <Link href="/docs" className="hover:text-white transition">
              Docs
            </Link>
          </div>

          {/* Right: Docs, CTA & Mobile Toggle */}
          <div className="flex items-center justify-end gap-5 text-gray-600 font-medium">
            <Button
              onClick={() => (window.location.href = "/signin")}
              className="hover:text-black transition hidden lg:block"
            >
              Get started
            </Button>
            <Button
              onClick={() => (window.location.href = "/github")}
              className="hover:text-black transition hidden lg:block"
            >
              GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/demos")}
              className="bg-black text-white px-4 py-2 rounded-md transition hidden sm:block"
            >
              View demo
            </Button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-white p-2 z-50 relative"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="w-7 h-7" />
              ) : (
                <Menu className="w-7 h-7" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-20 min-h-screen fixed inset-0 z-60 bg-black flex flex-col items-center justify-center gap-8 text-white font-syne md:hidden"
          >
            <Link
              href="/#quickstart"
              onClick={toggleMenu}
              className="text-4xl font-bold tracking-tight hover:text-[#58A0B4] transition"
            >
              Quickstart
            </Link>
            <Link
              href="/#integrations"
              onClick={toggleMenu}
              className="text-4xl font-bold tracking-tight hover:text-[#58A0B4] transition"
            >
              Integrations
            </Link>
            <Link
              href="/docs"
              onClick={toggleMenu}
              className="text-4xl font-bold tracking-tight hover:text-[#58A0B4] transition"
            >
              Docs
            </Link>
            <Link
              href="/github"
              onClick={toggleMenu}
              className="text-4xl font-bold tracking-tight hover:text-[#58A0B4] transition"
            >
              Github
            </Link>

            <div className="w-32 h-[1px] bg-white/20 my-2" />
            {/* <Link
              href="/github"
              onClick={toggleMenu}
              className="text-2xl text-gray-400 hover:text-white transition"
            >
              Github
            </Link> */}

            <Button
              onClick={() => {
                window.location.href = "/signin";
                toggleMenu();
              }}
              className="mt-2 bg-white text-black px-8 py-6 text-lg w-64 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              Get started
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/demos";
                toggleMenu();
              }}
              className="bg-black text-white py-6 text-lg w-64 "
            >
              View demo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
