import { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - ColorBook AI",
  description: "Terms of service for using ColorBook AI.",
};

export default function TermsPage() {
  return (
    <main className="relative">
      <PageHeader
        badge="Legal"
        badgeIcon={<FileText className="h-3.5 w-3.5" />}
        title="Terms of Service"
        subtitle="Last updated: January 2024"
      />

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <div>
            <h2 className="text-xl font-semibold">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service govern your use of ColorBook AI ("the Service"). By accessing or using the Service, 
              you agree to be bound by these terms. If you disagree with any part, you may not access the Service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">2. Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account, you must provide accurate and complete information. You are responsible for 
              maintaining the security of your account and password. You agree to notify us immediately of any unauthorized use.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree NOT to use the Service to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Generate content featuring copyrighted characters without authorization</li>
              <li>Create harmful, offensive, or illegal content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Generate content depicting real people without consent</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">4. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              ColorBook AI uses artificial intelligence to generate images and text. While we strive for quality:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>AI outputs may not always be perfect or suitable for your needs</li>
              <li>You are solely responsible for reviewing content before publishing</li>
              <li>We do not guarantee AI outputs will meet specific platform requirements</li>
              <li>You must ensure generated content complies with Amazon KDP and other platform policies</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of the prompts you create and, subject to our AI providers' terms, the images generated 
              from those prompts. You grant us a license to use your content for operating and improving the Service.
            </p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              The Service itself, including its design, code, and branding, remains our intellectual property.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">6. Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              We offer a 14-day money-back guarantee for paid plans. If you're unsatisfied, contact support within 14 days 
              of your purchase for a full refund. Refunds are not available after this period.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, 
              incidental, special, or consequential damages resulting from your use of the Service. Our total liability 
              shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the Service after changes constitutes 
              acceptance of the new terms. We will notify users of significant changes via email or in-app notice.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at support@colorbook.ai or visit our Contact page.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
