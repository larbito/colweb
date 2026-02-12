export function GradientBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden
    >
      <div className="hero-gradient absolute inset-0" />
    </div>
  );
}
