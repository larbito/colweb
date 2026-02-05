'use client';

/**
 * Upgrade Page
 * 
 * Shows pricing plans with storage retention benefits.
 */
import { Check, Clock, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with coloring book creation',
    features: [
      { text: '5 pages per project', included: true },
      { text: '72 hour file storage', included: true, highlight: true },
      { text: 'Basic image generation', included: true },
      { text: 'PNG downloads', included: true },
      { text: 'Standard quality', included: true },
    ],
    cta: 'Current Plan',
    disabled: true,
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For serious creators and publishers',
    features: [
      { text: 'Unlimited pages', included: true },
      { text: '30 day file storage', included: true, highlight: true },
      { text: 'Priority image generation', included: true },
      { text: 'PDF & ZIP exports', included: true },
      { text: 'HD quality', included: true },
      { text: 'Style cloning', included: true },
      { text: 'Batch generation', included: true },
    ],
    cta: 'Upgrade to Pro',
    disabled: false,
    popular: true,
  },
  {
    name: 'Business',
    price: '$49',
    period: '/month',
    description: 'For teams and high-volume creators',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: '90 day file storage', included: true, highlight: true },
      { text: 'API access', included: true },
      { text: 'Team collaboration', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Priority support', included: true },
      { text: 'Commercial license', included: true },
    ],
    cta: 'Contact Sales',
    disabled: false,
    popular: false,
  },
];

export default function UpgradePage() {
  return (
    <div className="container max-w-6xl py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Clock className="h-4 w-4" />
          Keep your files longer
        </div>
        <h1 className="text-4xl font-bold mb-4">
          Upgrade Your Plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get more storage time, unlimited pages, and premium features to create 
          professional coloring books faster.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`relative ${
              plan.popular 
                ? 'border-2 border-primary shadow-lg scale-105' 
                : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-2">
                {plan.name === 'Free' && <Sparkles className="h-8 w-8 text-muted-foreground" />}
                {plan.name === 'Pro' && <Zap className="h-8 w-8 text-primary" />}
                {plan.name === 'Business' && <Crown className="h-8 w-8 text-amber-500" />}
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className={`h-5 w-5 flex-shrink-0 ${
                      feature.highlight 
                        ? 'text-amber-500' 
                        : 'text-green-500'
                    }`} />
                    <span className={feature.highlight ? 'font-medium' : ''}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={plan.popular ? 'default' : 'outline'}
                disabled={plan.disabled}
                onClick={() => {
                  if (plan.name === 'Business') {
                    window.location.href = '/contact';
                  } else {
                    // TODO: Implement Stripe checkout
                    alert('Stripe checkout coming soon!');
                  }
                }}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Storage Comparison */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold">File Storage Comparison</h3>
              <p className="text-sm text-muted-foreground">
                How long your generated files are kept before auto-deletion
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">72 hours</p>
              <p className="text-sm text-muted-foreground">Free Plan</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center border-2 border-primary">
              <p className="text-2xl font-bold text-primary">30 days</p>
              <p className="text-sm text-primary">Pro Plan</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">90 days</p>
              <p className="text-sm text-amber-600">Business Plan</p>
            </div>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            After the storage period, files are automatically deleted. 
            Download your files before expiry or upgrade for longer storage.
          </p>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="mt-12 text-center">
        <h3 className="text-lg font-bold mb-2">Questions?</h3>
        <p className="text-muted-foreground mb-4">
          Check our <a href="/faq" className="text-primary hover:underline">FAQ</a> or{' '}
          <a href="/contact" className="text-primary hover:underline">contact us</a>.
        </p>
      </div>
    </div>
  );
}

