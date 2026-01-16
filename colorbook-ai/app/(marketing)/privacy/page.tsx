export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container py-20">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Privacy</h1>
          <p className="text-muted-foreground">
            We only store essential project metadata. Image previews may expire and can be regenerated.
          </p>
        </div>
      </section>
    </div>
  );
}

