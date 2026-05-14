"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LogOut,
  User,
  Key,
  CheckCircle,
  Shield,
  Copy,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const DashboardPage = () => {
  const [userData, setUserData] = useState<any>(null);
  const [provisionData, setProvisionData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndProvision = async () => {
      try {
        setIsProvisioning(true);
        setAuthError(null);

        // 1. Check actual production Supabase session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = session?.user;

        if (user) {
          setUserData(user);

          // 2. Provision developer account in Vouch Backend
          const res = await fetch(
            "http://localhost:5000/v1/developer/provision",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email || "developer@github.com",
                supabaseUid: user.id,
                name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  user.email?.split("@")[0] ||
                  "GitHub Developer",
                avatarUrl: user.user_metadata?.avatar_url || "",
                metadata: user.user_metadata || {},
              }),
            },
          );

          const data = await res.json();
          if (!res.ok) {
            throw new Error(
              data.message ||
                "Failed to provision developer account in Vouch backend.",
            );
          }

          setProvisionData(data);
          localStorage.setItem("vouch_api_key", data.apiKey?.rawKey || "");
          localStorage.setItem("vouch_dev_id", data.developerId || "");
        } else {
          window.location.href = "/signin";
        }
      } catch (err: any) {
        console.error("Dashboard Auth Error:", err);
        setAuthError(
          err.message ||
            "Authentication verification failed. Please log in again.",
        );
      } finally {
        setIsProvisioning(false);
      }
    };

    checkAuthAndProvision();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vouch_api_key");
    localStorage.removeItem("vouch_dev_id");
    window.location.href = "/signin";
  };

  const copyApiKey = () => {
    if (provisionData?.apiKey?.rawKey) {
      navigator.clipboard.writeText(provisionData.apiKey.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col font-syne bg-black text-white selection:bg-[#58A0B4] selection:text-black">
      <nav className="w-full sticky top-0 z-50 backdrop-blur-md font-syne border-b border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
          <div className="grid grid-cols-2 h-20 items-center text-sm">
            <div className="flex items-center gap-4 justify-start">
              <Link
                href="/"
                className="font-bold text-xl tracking-tight text-white z-50"
              >
                {`{`} vouch{` }`}
                <span className="text-[#58a0b4] text-3xl">.</span>sdk
              </Link>
            </div>

            <div className="flex items-center justify-end gap-5 font-dm-sans text-gray-600 font-medium">
              {userData && (
                <div className="hidden sm:flex items-center gap-3 mr-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-mono">
                  {userData.user_metadata?.avatar_url ? (
                    <img
                      src={userData.user_metadata.avatar_url}
                      alt="Avatar"
                      className="w-5 h-5 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                  <span>
                    {userData.user_metadata?.full_name || userData.email}
                  </span>
                </div>
              )}

              <ButtonGroup>
                <ButtonGroup>
                  <Button
                    className="text-white border-white/10 hover:bg-white/10"
                    variant="outline"
                    size="icon-lg"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                </ButtonGroup>

                <ButtonGroup>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon-lg"
                        className="hover:bg-red-600 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="font-dm-sans bg-[#111] border border-white/10 text-white rounded-2xl p-6 shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-syne text-xl">
                          Do you want to log out?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          You will be logged out of your developer session.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleLogout}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ButtonGroup>
              </ButtonGroup>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1 font-dm-sans">
        {isProvisioning ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <RefreshCw className="w-8 h-8 text-[#58A0B4] animate-spin" />
            <h2 className="text-xl font-syne font-semibold">
              Provisioning Developer Hub...
            </h2>
            <p className="text-gray-400 text-sm">
              Authenticating with GitHub & Supabase identity
            </p>
          </div>
        ) : authError ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center max-w-md mx-auto animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-syne font-bold">
                Authentication Error
              </h2>
              <p className="text-gray-400 text-sm mt-2">{authError}</p>
            </div>
            <Button
              onClick={() => (window.location.href = "/signin")}
              className="bg-white text-black hover:bg-gray-200 px-6 py-5 rounded-xl font-syne font-semibold"
            >
              Return to Sign In
            </Button>
          </div>
        ) : (
          <div className="space-y-10 animate-fade-in">
            {/* Greeting / Overview */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div>
                <h1 className="text-3xl md:text-4xl font-syne font-bold tracking-tight">
                  Developer Dashboard
                </h1>
                <p className="text-gray-400 mt-1">
                  Welcome back,{" "}
                  <span className="text-white font-mono">
                    {userData?.email}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 bg-[#58A0B4]/10 border border-[#58A0B4]/20 px-4 py-2 rounded-xl text-sm font-mono text-[#58A0B4]">
                <Shield className="w-4 h-4" />
                <span>Identity Verified via GitHub</span>
              </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-syne">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-transparent border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-[#58A0B4]/40 transition-all">
                <div className="text-sm font-dm-sans text-gray-400 mb-2">
                  Total API Requests
                </div>
                <div className="text-4xl font-bold tracking-tight">1,492</div>
                <div className="text-xs font-dm-sans text-green-400 mt-2 flex items-center gap-1">
                  <span>↑ 12% from last week</span>
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#58A0B4] group-hover:scale-110 transition-transform">
                  <Key className="w-5 h-5" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-transparent border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-green-500/40 transition-all">
                <div className="text-sm font-dm-sans text-gray-400 mb-2">
                  Verified Identities
                </div>
                <div className="text-4xl font-bold tracking-tight text-white">
                  384
                </div>
                <div className="text-xs font-dm-sans text-gray-500 mt-2">
                  Active platform users
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-transparent border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-[#58A0B4]/40 transition-all">
                <div className="text-sm font-dm-sans text-gray-400 mb-2">
                  Active Agreements
                </div>
                <div className="text-4xl font-bold tracking-tight">24</div>
                <div className="text-xs font-dm-sans text-[#58A0B4] mt-2">
                  Funded & In Progress
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#58A0B4]/10 flex items-center justify-center text-[#58A0B4] group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* API Key Management Section */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-syne font-bold tracking-tight">
                    API Credentials
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Use this secret key to authenticate SDK requests to the
                    Vouch Trust Engine.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                    Developer ID
                  </label>
                  <div className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl font-mono text-sm text-[#58A0B4] flex items-center justify-between">
                    <span>{provisionData?.developerId || "Loading..."}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                    Secret API Key
                  </label>
                  <div className="w-full bg-black/40 border border-white/10 p-2 rounded-xl flex items-center justify-between gap-4">
                    <span className="font-mono text-sm px-3 text-white truncate">
                      {provisionData?.apiKey?.rawKey || "Loading..."}
                    </span>
                    <Button
                      onClick={copyApiKey}
                      className="bg-white text-black hover:bg-gray-200 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-syne font-medium shrink-0 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? "Copied!" : "Copy Secret Key"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-dm-sans flex items-center gap-3">
                <span className="font-bold uppercase tracking-wider">
                  Security Notice:
                </span>
                <span>
                  Keep your API key secure. Never expose it in client-side
                  public code or repositories.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
