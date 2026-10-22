// /app/he/layout.tsx — the Hebrew public pages read right to left from the
// server's first paint.

export default function HebrewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="he" dir="rtl">
      {children}
    </div>
  );
}
