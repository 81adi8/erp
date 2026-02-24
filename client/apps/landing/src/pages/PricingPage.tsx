import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  X, 
  Zap, 
  Building2, 
  GraduationCap,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Section, SectionHeader, Card, Button, Badge } from '@components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem, GlowingOrb } from '@components/animations';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small schools just getting started.',
    icon: GraduationCap,
    monthlyPrice: 49,
    yearlyPrice: 470,
    features: [
      { name: 'Up to 500 students', included: true },
      { name: 'Core modules (SIS, Academics)', included: true },
      { name: 'Email support', included: true },
      { name: 'Basic reports', included: true },
      { name: 'Mobile app access', included: true },
      { name: 'Multi-campus support', included: false },
      { name: 'Custom integrations', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom branding', included: false },
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For growing institutions that need more power.',
    icon: Building2,
    monthlyPrice: 149,
    yearlyPrice: 1430,
    features: [
      { name: 'Up to 2,000 students', included: true },
      { name: 'All modules included', included: true },
      { name: 'Priority email & chat support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Mobile app access', included: true },
      { name: 'Multi-campus support', included: true },
      { name: 'API access', included: true },
      { name: 'Custom integrations', included: false },
      { name: 'Dedicated account manager', included: false },
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large institutions with complex requirements.',
    icon: Zap,
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      { name: 'Unlimited students', included: true },
      { name: 'All modules included', included: true },
      { name: '24/7 phone, email & chat support', included: true },
      { name: 'Advanced analytics + BI tools', included: true },
      { name: 'White-label mobile app', included: true },
      { name: 'Unlimited campuses', included: true },
      { name: 'Full API access', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faqs = [
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated based on your billing cycle.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All plans come with a 14-day free trial. No credit card required to get started.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans. Enterprise customers can also pay via invoice.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'Yes, we offer a 30-day money-back guarantee on all plans. If you are not satisfied, contact us for a full refund.',
  },
  {
    question: 'Do you offer discounts for non-profits?',
    answer: 'Yes! Educational non-profits and NGOs are eligible for up to 50% discount. Contact our sales team for details.',
  },
  {
    question: 'What happens when I exceed my student limit?',
    answer: 'We will notify you when you are approaching your limit. You can either upgrade your plan or purchase additional capacity.',
  },
];

export const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <>
      {/* Hero */}
      <Section className="pt-32 relative overflow-hidden">
        <GlowingOrb className="-top-40 left-1/4" color="var(--color-primary)" size={500} />
        <GlowingOrb className="top-20 -right-40" color="var(--color-secondary)" size={400} />
        
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="primary" className="mb-4">Pricing</Badge>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-text mb-6">
              Simple, Transparent
              <span className="block text-gradient">Pricing</span>
            </h1>
            <p className="text-lg text-text-secondary mb-8">
              Choose the plan that fits your institution. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-surface-hover rounded-xl">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  !isYearly 
                    ? 'bg-surface text-text shadow-sm' 
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isYearly 
                    ? 'bg-surface text-text shadow-sm' 
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                Yearly
                <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </Section>

      {/* Pricing Cards */}
      <Section className="pt-8">
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <StaggerItem key={plan.name}>
              <Card 
                className={`h-full relative ${
                  plan.popular 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="primary">Most Popular</Badge>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center`}>
                    <plan.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-text">{plan.name}</h3>
                  </div>
                </div>

                <p className="text-text-secondary mb-6">{plan.description}</p>

                <div className="mb-6">
                  {plan.monthlyPrice ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-text">
                        ${isYearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice}
                      </span>
                      <span className="text-text-secondary">/month</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-text">Custom</div>
                  )}
                  {plan.yearlyPrice && isYearly && (
                    <p className="text-sm text-text-muted mt-1">
                      ${plan.yearlyPrice} billed yearly
                    </p>
                  )}
                </div>

                <Link to="/contact" className="block mb-6">
                  <Button 
                    variant={plan.popular ? 'primary' : 'outline'} 
                    className="w-full"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <div className="pt-6 border-t border-border">
                  <p className="text-sm font-medium text-text mb-4">What's included:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li 
                        key={feature.name} 
                        className={`flex items-center gap-3 text-sm ${
                          feature.included ? 'text-text-secondary' : 'text-text-muted'
                        }`}
                      >
                        {feature.included ? (
                          <Check className="w-5 h-5 text-success flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-text-muted flex-shrink-0" />
                        )}
                        {feature.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* Comparison Table - Desktop */}
      <Section className="hidden lg:block">
        <ScrollReveal>
          <SectionHeader
            badge="Compare Plans"
            title="Full Feature Comparison"
            description="See all features side by side to find the perfect fit."
          />
        </ScrollReveal>

        <ScrollReveal>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 text-text">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.name} className="text-center py-4 px-6 text-text">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans[0].features.map((feature, index) => (
                  <tr key={feature.name} className="border-b border-border/50">
                    <td className="py-4 px-6 text-text-secondary">{feature.name}</td>
                    {plans.map((plan) => (
                      <td key={plan.name} className="text-center py-4 px-6">
                        {plan.features[index].included ? (
                          <Check className="w-5 h-5 text-success mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-text-muted mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </Section>

      {/* FAQ Section */}
      <Section className="bg-surface-hover">
        <ScrollReveal>
          <SectionHeader
            badge="FAQ"
            title="Frequently Asked Questions"
            description="Got questions? We've got answers."
          />
        </ScrollReveal>

        <div className="max-w-3xl mx-auto">
          <StaggerContainer className="space-y-4">
            {faqs.map((faq, index) => (
              <StaggerItem key={faq.question}>
                <Card hover={false} className="p-6">
                  <div className="flex gap-4">
                    <HelpCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-text mb-2">{faq.question}</h3>
                      <p className="text-text-secondary">{faq.answer}</p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <ScrollReveal>
          <div className="text-center bg-gradient-mixed rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Need a Custom Plan?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              We offer custom pricing for large institutions and special requirements. Let's talk!
            </p>
            <Link to="/contact">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Contact Sales <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </Section>
    </>
  );
};
