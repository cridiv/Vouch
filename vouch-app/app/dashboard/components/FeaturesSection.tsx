"use client";
import { useState } from "react";
import {
  ChevronDown,
  Shield,
  UserCheck,
  AlertTriangle,
  Fingerprint,
  Activity,
  Clock,
  Zap,
  Settings,
  Globe,
} from "lucide-react";

const featuresData = [
  {
    category: "Core Verification",
    items: [
      {
        name: "Identity Verification",
        icon: UserCheck,
        status: "ON",
        active: true,
      },
      {
        name: "Liveness Detection",
        icon: Fingerprint,
        status: "ON",
        active: true,
      },
      { name: "Document Extraction", icon: Zap, status: "OFF", active: false },
    ],
  },
  {
    category: "Fraud & Risk",
    items: [
      {
        name: "Fraud Assessment",
        icon: AlertTriangle,
        status: "ON",
        active: true,
      },
      {
        name: "Watchlist Screening",
        icon: Shield,
        status: "OFF",
        active: false,
      },
      {
        name: "VPN/Proxy Detection",
        icon: Activity,
        status: "ON",
        active: true,
      },
    ],
  },
  {
    category: "Customization & Rules",
    items: [
      {
        name: "Custom Risk Scores",
        icon: Settings,
        status: "ON",
        active: true,
      },
      { name: "Geo-Fencing", icon: Globe, status: "OFF", active: false },
    ],
  },
];

export function FeaturesSection() {
  const [openCat, setOpenCat] = useState("Core Verification");

  return (
    <div className="space-y-4 w-full mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-syne text-white">SDK Features & Config</h2>
      </div>

      <div className="space-y-3">
        {featuresData.map((cat) => (
          <div
            key={cat.category}
            className={`overflow-hidden transition-all duration-300 rounded-3xl ${
              openCat === cat.category
                ? "bg-white/[0.04] border border-white/10"
                : "bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.05]"
            }`}
          >
            <div
              onClick={() =>
                setOpenCat(cat.category === openCat ? "" : cat.category)
              }
              className="flex items-center justify-between p-6 select-none"
            >
              <h3 className="text-lg text-white font-medium flex items-center gap-3">
                {cat.category}
              </h3>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform ${openCat === cat.category ? "rotate-180 text-white" : ""}`}
              />
            </div>

            {openCat === cat.category && (
              <div className="px-6 pb-6 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {cat.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl bg-black/40 border border-white/5 p-4 hover:border-white/10 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex w-11 h-11 items-center justify-center rounded-xl bg-white/[0.05] transition-colors ${item.active ? "text-[#58A0B4] group-hover:bg-[#58A0B4]/10" : "text-gray-500 group-hover:bg-white/[0.08]"}`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-sm font-medium ${item.active ? "text-white" : "text-gray-400"}`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold transition-transform group-hover:scale-105 ${item.active ? "bg-[#58A0B4]/20 text-[#58A0B4]" : "bg-gray-800 text-gray-400"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
