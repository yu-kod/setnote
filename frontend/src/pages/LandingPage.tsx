import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const ctaBase =
  "inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-semibold no-underline transition-colors";

const features = [
  {
    title: "かんたん作成",
    body: "曲名とリンクを並べるだけ。イベント情報もまとめて管理できます。",
  },
  {
    title: "そのまま共有",
    body: "公開URLを配るだけで、アカウント不要で誰でも閲覧できます。",
  },
  {
    title: "埋め込み対応",
    body: "YouTube / Spotify / SoundCloud のリンクをそのまま楽曲に添付。",
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="py-8">
      <section className="text-center">
        <h2 className="text-2xl font-bold md:text-3xl">
          DJ セットリストを、かんたんに作成・共有
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          プレイした曲をまとめて、公開URL一つでファンに届けよう。
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={`${ctaBase} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              ダッシュボードへ
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className={`${ctaBase} bg-primary text-primary-foreground hover:bg-primary/90`}
              >
                新規登録
              </Link>
              <Link
                to="/login"
                className={`${ctaBase} border border-border text-foreground hover:border-primary`}
              >
                ログイン
              </Link>
            </>
          )}
        </div>
      </section>

      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <li
            key={f.title}
            className="rounded-lg border border-border bg-card p-4 text-card-foreground"
          >
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
