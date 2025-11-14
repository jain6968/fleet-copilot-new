"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();

    // 🔐 Hardcoded credentials
    const VALID_USER = "admin";
    const VALID_PASS = "admin123";

    if (username === VALID_USER && password === VALID_PASS) {
      // Save login state
      localStorage.setItem("fleet_auth", "yes");
      document.cookie = "fleet_auth=yes; path=/;";

      // Redirect to main dashboard
      router.push("/");
    } else {
      setErr("Invalid username or password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-4">
          Fleet Copilot Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full border px-3 py-2 rounded text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border px-3 py-2 rounded text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>

        {err && (
          <p className="text-red-600 text-sm mt-2 text-center">{err}</p>
        )}

        {/* Dummy SSO */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Or login with</p>
          <div className="flex justify-center gap-3 mt-2">
            <button className="px-4 py-1 border rounded hover:bg-gray-100">
              Google
            </button>
            <button className="px-4 py-1 border rounded hover:bg-gray-100">
              Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
