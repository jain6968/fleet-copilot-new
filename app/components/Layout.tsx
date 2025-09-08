import { signOut, useSession } from "next-auth/react";

export default function Layout({ children }: { children: React.ReactNode }){
  const { data } = useSession();
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-3">
          <button className="text-2xl">Menu</button>
          <input
            className="flex-1 rounded border px-4 py-2"
            placeholder="VIN, license plate, job ID, or part number"
            onKeyDown={(e)=>{
              if(e.key === "Enter"){
                const q = (e.target as HTMLInputElement).value.trim();
                if(q) window.location.href = `/?q=${encodeURIComponent(q)}`;
              }
            }}
          />
          <button className="text-xl">Bell</button>
          <button onClick={() => signOut()} className="text-xl">
            {data?.user?.name || "Profile"}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
