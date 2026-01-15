import { SignedIn } from '@clerk/nextjs';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedIn>
      <div className="container py-10">{children}</div>
    </SignedIn>
  );
}


