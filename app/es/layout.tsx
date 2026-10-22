// /app/es/layout.tsx — the Mexican Spanish public pages carry their language.

export default function SpanishLayout({ children }: { children: React.ReactNode }) {
  return <div lang="es-MX">{children}</div>;
}
