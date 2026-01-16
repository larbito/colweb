"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Clock, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const contactOptions = [
  {
    icon: Mail,
    title: "Email us",
    description: "support@colorbook.ai",
    detail: "For general inquiries and support",
  },
  {
    icon: Clock,
    title: "Response time",
    description: "Within 24–48 hours",
    detail: "We reply to every message",
  },
];

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast.success("Message received! We'll get back to you soon.");
    setForm({ name: "", email: "", message: "" });
    setLoading(false);
  };

  return (
    <main className="relative">
      <PageHeader
        badge="Contact"
        badgeIcon={MessageSquare}
        title="Get in touch"
        subtitle="Have a question or need help? We're here for you."
      />

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Options */}
          <div className="space-y-6">
            {contactOptions.map((option) => (
              <Card key={option.title} className="border-border/50 bg-card/50">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <option.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm font-medium text-primary">{option.description}</p>
                    <p className="text-sm text-muted-foreground">{option.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="rounded-xl border border-border/50 bg-muted/30 p-6">
              <p className="mb-3 text-sm font-medium">Quick links</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/faq">FAQ</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/terms">Terms</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/privacy">Privacy</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <h3 className="mb-6 text-lg font-semibold">Send us a message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Name</label>
                  <Input
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="How can we help?"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    rows={5}
                    className="rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

