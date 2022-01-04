import "../styles/globals.scss";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import "ress";
import type { AppProps } from "next/app";

if (process.env.NODE_ENV === "development") {
  require("../styles/show-breakpoints.scss");
}

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return <Component {...pageProps} />;
}

export default MyApp;
