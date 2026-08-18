import { Analytics } from "@vercel/analytics/next";
import { type Metadata, type Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Noto_Sans_JP as NotoSansJP } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type JSX, type ReactNode } from "react";
import "react-toggle/style.css";
import Layout from "./_components/Layout";

const notoSansJP = NotoSansJP({ subsets: ["latin"] });
const APP_NAME = "オモコロアーカイブ";
const APP_DEFAULT_TITLE = "オモコロアーカイブ";
const APP_TITLE_TEMPLATE = "%s";
const APP_DESCRIPTION = "オモコロの非公式アーカイブサイトです";

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  applicationName: APP_NAME,
  description: APP_DESCRIPTION,
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    type: "website",
  },
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  twitter: {
    card: "summary_large_image",
    description: APP_DESCRIPTION,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <body className={notoSansJP.className}>
        <ThemeProvider enableSystem={false}>
          <NuqsAdapter>
            <Layout>{children}</Layout>
          </NuqsAdapter>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
