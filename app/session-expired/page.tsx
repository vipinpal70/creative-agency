"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionExpiredPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Clear all client-side storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // storage may be unavailable in some contexts
    }

    // Clear the server-side cookie via logout API
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

    // Countdown then redirect
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          router.replace("/sign-in");
        }
        return n - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">Session expired</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your session has expired after 8 hours of inactivity. All local data has been cleared.
        </p>

        <p className="text-sm text-gray-400">
          Redirecting to sign in in{" "}
          <span className="font-semibold text-gray-700">{countdown}</span>s…
        </p>

        <button
          onClick={() => router.replace("/sign-in")}
          className="mt-5 w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign in now
        </button>
      </div>
    </div>
  );
}
