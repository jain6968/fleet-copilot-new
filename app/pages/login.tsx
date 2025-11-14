// pages/login.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // If already "logged in", redirect to home
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasLocal = localStorage.getItem("fleet_auth") === "yes";
    const hasCookie = document.cookie.includes("fleet_auth=yes");

    if (hasLocal || hasCookie) {
      router.replace("/");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 🔐 Hardcoded credentials for now
    const okUser = "admin";
    const okPass = "admin123";

    if (username === okUser && password === okPass) {
      if (typeof window !== "undefined") {
        localStorage.setItem("fleet_auth", "yes");
        document.cookie = "fleet_auth=yes; path=/";
      }
      router.replace("/");
    } else {
      setError("Invalid username or password");
    }
  }

  function handleDummySSO(provider: string) {
    alert(`${provider} SSO coming soon…`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          Fleet CoPilot
        </h1>
        <p className="mb-6 text-gray-600 text-center">
          Sign in to start diagnostics.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6">
          <p className="text-xs text-gray-500 text-center mb-2">
            Or continue with
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDummySSO("Microsoft")}
              className="flex-1 border rounded py-2 text-sm hover:bg-gray-50"
            >
              Microsoft SSO
            </button>
            <button
              onClick={() => handleDummySSO("Google")}
              className="flex-1 border rounded py-2 text-sm hover:bg-gray-50"
            >
              Google SSO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
