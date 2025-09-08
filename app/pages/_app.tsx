import "../styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";

export default function MyApp({ Component, pageProps }: AppProps) {
  // @ts-ignore
  return (
    <SessionProvider session={pageProps?.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
