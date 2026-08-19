import pageMetadata from "../pageMetadata";
import Settings from "./_components/Settings";

export const metadata = pageMetadata({
  description: "表示するカテゴリーや配色の設定を変更します。",
  indexable: false,
  path: "/settings",
  title: "設定",
});

export const dynamic = "force-dynamic";

export default async function Page(): Promise<React.JSX.Element> {
  return <Settings />;
}
