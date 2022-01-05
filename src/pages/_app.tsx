import "../styles/globals.scss";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import "react-toggle/style.css";
import "ress";
import type { AppProps } from "next/app";
import Head from "next/head";

if (process.env.NODE_ENV === "development") {
  require("../styles/show-breakpoints.scss");
}

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <>
      <Head>
        <meta
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
          name="viewport"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
