'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function ClerkControls() {
  return (
    <>
      <SignedOut>
        <Button asChild variant="secondary" className="rounded-2xl">
          <SignInButton mode="modal">Sign in</SignInButton>
        </Button>
      </SignedOut>
      <SignedIn>
        <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} />
      </SignedIn>
    </>
  );
}


