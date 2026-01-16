import { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - ColorBook AI",
  description: "Privacy policy for ColorBook AI - how we collect and use your data.",
};

export default function PrivacyPage() {
  return (
    <main className="relative">
      <PageHeader
        badge="Legal"
        badgeIcon={<Shield className="h-3.5 w-3.5" />}
        title="Privacy Policy"
        subtitle="Last updated: January 2024"
      />

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <div>
            <h2 className="text-xl font-semibold">1. What We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">We collect information you provide directly:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Account information:</strong> Email address, name, and password</li>
              <li><strong>Project data:</strong> Your prompts, project settings, and metadata</li>
              <li><strong>Usage data:</strong> How you interact with our features</li>
              <li><strong>Payment information:</strong> Processed securely through Stripe (we don't store card details)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">2. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Provide and improve the Service</li>
              <li>Process your transactions</li>
              <li>Send important updates and notifications</li>
              <li>Respond to support requests</li>
              <li>Analyze usage patterns to improve features</li>
            </ul>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We do NOT sell your personal information to third parties.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">3. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">We use cookies for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Essential cookies:</strong> Required for the Service to function (authentication, preferences)</li>
              <li><strong>Analytics cookies:</strong> Help us understand how you use the Service (can be disabled)</li>
            </ul>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              You can control cookie settings in your browser. Disabling essential cookies may affect functionality.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share data with trusted third parties to operate the Service:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>OpenAI:</strong> Processes your prompts to generate content</li>
              <li><strong>Replicate:</strong> Generates images from prompts</li>
              <li><strong>Stripe:</strong> Handles payment processing</li>
              <li><strong>Vercel:</strong> Hosts our application</li>
            </ul>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              These providers have their own privacy policies. We recommend reviewing them.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account, we will delete 
              your personal data within 30 days, except where we're required to retain it for legal purposes.
            </p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Generated images may be cached temporarily but are not permanently stored after project deletion.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">7. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit (HTTPS), 
              secure password hashing, and regular security audits. However, no method of transmission over the 
              Internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">8. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via 
              email or in-app notice. Continued use after changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions, contact us at privacy@colorbook.ai or visit our Contact page.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
