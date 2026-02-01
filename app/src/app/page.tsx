"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Key, Link2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Script from "next/script";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        themeParams: any;
      };
    };
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [fileName, setFileName] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);

  // Load key & Telegram Init
  useEffect(() => {
    const savedKey = localStorage.getItem("vortex_access_key");
    if (savedKey) setAccessKey(savedKey);

    // Check for Telegram Web App
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Use full screen
      setIsTelegram(true);
    }
  }, []);

  const handleYoink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url) return;

    setLoading(true);
    setStatus("idle");
    setMessage("");
    setDownloadLink("");

    localStorage.setItem("vortex_access_key", accessKey);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/yoink`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Key": accessKey,
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to yoink.");
      }

      setStatus("success");
      setFileName(data.title);
      setDownloadLink(`${apiUrl}${data.download_url}?token=${accessKey}`);
      setMessage("Yoinked successfully!");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={cn(
      "min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-4 selection:bg-indigo-500/30",
      isTelegram ? "justify-start pt-8" : "justify-center"
    )}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4"
          >
            <Download className="w-8 h-8 text-indigo-400" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            Vortex
          </h1>
          <p className="text-zinc-500">
            {isTelegram ? "Telegram Mini App" : "Private Media Downloader"}
          </p>
        </div>

        {/* Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-xl shadow-2xl shadow-indigo-500/5"
        >
          <form onSubmit={handleYoink} className="space-y-4">
            
            {/* Access Key Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="password"
                placeholder="Access Key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* URL Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="url"
                required
                placeholder="Paste media URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center space-x-2 rounded-xl py-3 text-sm font-medium transition-all duration-200",
                loading 
                  ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pulling...</span>
                </>
              ) : (
                <>
                  <span>Vortex It</span>
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          <AnimatePresence mode="wait">
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{message}</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col gap-3 text-green-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium text-sm">Ready to Download</span>
                  </div>
                  <p className="text-zinc-400 text-xs truncate w-full">{fileName}</p>
                  
                  <a
                    href={downloadLink}
                    download
                    className="flex items-center justify-center gap-2 w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
                  >
                    <Download className="w-3 h-3" />
                    Download File
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-zinc-700 text-xs">
          Powered by yt-dlp • {isTelegram ? "Telegram Mode" : "Web Mode"}
        </p>
      </div>
    </main>
  );
}
