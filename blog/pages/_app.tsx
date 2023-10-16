import { AppProps } from "next/app";
import "../styles/index.css";
import "highlight.js/styles/vs2015.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
