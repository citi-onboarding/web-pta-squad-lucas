export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </main>
  );
}
