export type LegalSection = { heading: string; paragraphs: string[] };

// 利用規約・プライバシーポリシー共通のレイアウト。
// 文面（sections）はページ側に持たせ、後から差し替えやすくする。
export function LegalDocument({
  title,
  updatedAt,
  sections,
}: {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">最終更新日: {updatedAt}</p>
      </div>
      {sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="text-base font-semibold">{section.heading}</h3>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
