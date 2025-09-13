// app/pages/login.tsx
"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
// ✅ Pages Router: use next/router
import { useRouter } from "next/router";

export default function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If already authenticated, bounce to home
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="bg-white shadow p-8 rounded-xl max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-3">Fleet CoPilot</h1>
        <p className="mb-6 text-gray-600">Sign in to start diagnostics.</p>
        <button
          onClick={() => signIn("auth0", { callbackUrl: "/" })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Continue with SSO
        </button>
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx: any) {
  const { getSession } = await import("next-auth/react");
  const session = await getSession(ctx);
  if (session) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: {} };
}

