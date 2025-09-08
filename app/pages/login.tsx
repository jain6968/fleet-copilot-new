import { signIn } from "next-auth/react";

export default function Login(){
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="bg-white shadow p-8 rounded max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">Fleet CoPilot</h1>
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
