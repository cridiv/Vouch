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
  ExternalLink,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { CredentialsCard } from "./components/CredentialsCard";
import { AnalyticsSection } from "./components/AnalyticsSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { DashboardLinks } from "./components/DashboardLinks";

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState<"analytics" | "keys">("analytics");
  const [userData, setUserData] = useState<any>(null);
  const [provisionData, setProvisionData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Step 1 — Hash present means fresh OAuth redirect
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          window.history.replaceState(null, '', window.location.pathname);

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error || !data.session) {
            setAuthError('Session expired. Please sign in again.');
            setIsProvisioning(false);
            return;
          }

          await provision(data.session.user);
          return;
        }
      }

      // Step 2 — No hash — Supabase auto-restores persisted session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        await provision(session.user);
        return;
      }

      // Step 3 — No session at all
      window.location.href = '/signin';
    };

    const provision = async (user: any) => {
      setUserData(user);

      // Check if we already have provision data cached
      const cachedKey = localStorage.getItem('vouch_api_key');
      const cachedDevId = localStorage.getItem('vouch_dev_id');
      const cachedEmail = localStorage.getItem('vouch_dev_email');

      if (cachedDevId && cachedEmail === user.email) {
        // Returning user — use cached data, skip backend call
        setProvisionData({
          developerId: cachedDevId,
          apiKey: { prefix: localStorage.getItem('vouch_key_prefix') || '' },
        });
        setIsProvisioning(false);
        return;
      }

      // First time or cache miss — hit the backend
      setIsProvisioning(true);
      setAuthError(null);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const res = await fetch('https://vouch-fmql.onrender.com/v1/developer/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            email: user.email || "developer@github.com",
            supabaseUid: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || "GitHub Developer",
            avatarUrl: user.user_metadata?.avatar_url || '',
            metadata: user.user_metadata || {},
          }),
        });

        clearTimeout(timeout);

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Provision failed');

        // Cache everything for return visits
        localStorage.setItem('vouch_dev_id', data.developerId || '');
        localStorage.setItem('vouch_dev_email', user.email);
        localStorage.setItem('vouch_key_prefix', data.apiKey?.prefix || '');

        // Only store raw key if it is a new key (first time)
        if (data.apiKey?.rawKey) {
          localStorage.setItem('vouch_api_key', data.apiKey.rawKey);
        }

        setProvisionData(data);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setAuthError('Server is waking up — please wait 30 seconds and refresh.');
        } else {
          setAuthError(err.message || 'Authentication failed');
        }
      } finally {
        setIsProvisioning(false);
      }
    };

    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    
    // Clear all cached provision data
    localStorage.removeItem('vouch_api_key');
    localStorage.removeItem('vouch_dev_id');
    localStorage.removeItem('vouch_dev_email');
    localStorage.removeItem('vouch_key_prefix');
    
    window.location.href = '/signin';
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
      <nav className="w-full z-50 backdrop-blur-md font-syne border-b border-white/5 bg-black/20">
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

      {/* Secondary Navigation (Pills) */}
      <div className="flex flex-1 flex-col w-full sticky py-2 px-4 top-0 z-50 justify-center text-center border-b border-white/5 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-2 flex-nowrap scrollbar-hide">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-mono transition-all ${
                activeTab === "analytics"
                  ? "bg-[#58A0B4]/10 text-[#58A0B4]"
                  : "bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              Analytics & Logs
            </button>
            <button
              onClick={() => setActiveTab("keys")}
              className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-mono transition-all ${
                activeTab === "keys"
                  ? "bg-[#58A0B4]/10 text-[#58A0B4]"
                  : "bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              Keys
            </button>
            <Link
              href="/docs"
              target="_blank"
              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200 px-4 text-sm font-mono transition-all"
            >
              Docs <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>
          </div>
        </div>
      </div>

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
          <div className="flex flex-col items-center gap-2 animate-fade-in w-full max-w-5xl mx-auto">
            {/* Greeting / Overview */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 w-full mt-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-syne font-bold tracking-tight text-white mb-2">
                  Developer Dashboard
                </h1>
                <p className="text-gray-400 mt-1">
                  Welcome back,{" "}
                  <span className="text-white font-mono">
                    {userData?.email}
                  </span>
                </p>
              </div>
            </div>

            {activeTab === "analytics" ? (
              <>
                <AnalyticsSection />
                <FeaturesSection />
                <DashboardLinks />
              </>
            ) : (
              <>
                <CredentialsCard provisionData={provisionData} />
                <DashboardLinks />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
