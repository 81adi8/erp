import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Section, SectionHeader, Card, Button, Badge } from '@components/ui';
import { ScrollReveal, GlowingOrb } from '@components/animations';

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Send us an email and we\'ll respond within 24 hours.',
    contact: 'hello@eduerp.com',
    action: 'mailto:hello@eduerp.com',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Speak to our team during business hours.',
    contact: '+1 (234) 567-890',
    action: 'tel:+1234567890',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Chat with our support team in real-time.',
    contact: 'Available 24/7',
    action: '#',
  },
];

const offices = [
  {
    city: 'San Francisco',
    address: '123 Education Lane, Tech City, CA 94102',
    phone: '+1 (234) 567-890',
  },
  {
    city: 'London',
    address: '456 Learning Street, London, UK EC2A 4BX',
    phone: '+44 20 1234 5678',
  },
  {
    city: 'Singapore',
    address: '789 Knowledge Ave, Singapore 018956',
    phone: '+65 6789 0123',
  },
];

export const ContactPage = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <>
      {/* Hero */}
      <Section className="pt-32 relative overflow-hidden">
        <GlowingOrb className="-top-40 -left-40" color="var(--color-primary)" size={500} />
        <GlowingOrb className="top-20 -right-40" color="var(--color-secondary)" size={400} />
        
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="primary" className="mb-4">Contact Us</Badge>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-text mb-6">
              Let's Start a
              <span className="block text-gradient">Conversation</span>
            </h1>
            <p className="text-lg text-text-secondary">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </ScrollReveal>
      </Section>

      {/* Contact Methods */}
      <Section className="pt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {contactMethods.map((method, index) => (
            <ScrollReveal key={method.title} delay={index * 0.1}>
              <a href={method.action}>
                <Card className="text-center h-full">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <method.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">{method.title}</h3>
                  <p className="text-sm text-text-secondary mb-3">{method.description}</p>
                  <p className="font-medium text-primary">{method.contact}</p>
                </Card>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Contact Form & Info */}
      <Section>
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            <ScrollReveal direction="left">
              <Card className="p-8">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-success" />
                    </div>
                    <h3 className="text-2xl font-bold text-text mb-2">Message Sent!</h3>
                    <p className="text-text-secondary mb-6">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button onClick={() => setIsSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-text mb-6">Send Us a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-text mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formState.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formState.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-text mb-2">
                            Institution Name
                          </label>
                          <input
                            type="text"
                            name="company"
                            value={formState.company}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="Westside Academy"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formState.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="+1 (234) 567-890"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Subject *
                        </label>
                        <select
                          name="subject"
                          value={formState.subject}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                          <option value="">Select a subject</option>
                          <option value="demo">Request a Demo</option>
                          <option value="pricing">Pricing Inquiry</option>
                          <option value="support">Technical Support</option>
                          <option value="partnership">Partnership</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Message *
                        </label>
                        <textarea
                          name="message"
                          value={formState.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                          placeholder="Tell us how we can help..."
                        />
                      </div>

                      <Button 
                        type="submit" 
                        size="lg" 
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Message
                            <Send className="w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </Card>
            </ScrollReveal>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <ScrollReveal direction="right">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-text">Business Hours</h3>
                </div>
                <div className="space-y-2 text-text-secondary">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM (EST)</p>
                  <p>Saturday: 10:00 AM - 4:00 PM (EST)</p>
                  <p>Sunday: Closed</p>
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.1}>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-text">Our Offices</h3>
                </div>
                <div className="space-y-6">
                  {offices.map((office) => (
                    <div key={office.city}>
                      <h4 className="font-medium text-text mb-1">{office.city}</h4>
                      <p className="text-sm text-text-secondary mb-1">{office.address}</p>
                      <p className="text-sm text-primary">{office.phone}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.2}>
              <div className="bg-gradient-mixed rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-2">Enterprise Inquiries</h3>
                <p className="text-sm text-white/80 mb-4">
                  For large-scale deployments and custom solutions, our enterprise team is ready to help.
                </p>
                <a 
                  href="mailto:enterprise@eduerp.com" 
                  className="inline-flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
                >
                  enterprise@eduerp.com <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </Section>

      {/* Map Placeholder */}
      <Section className="pt-0">
        <ScrollReveal>
          <div className="h-80 lg:h-96 rounded-3xl bg-surface-hover border border-border flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <p className="text-text-secondary">Interactive Map</p>
              <p className="text-sm text-text-muted">Map integration available on request</p>
            </div>
          </div>
        </ScrollReveal>
      </Section>
    </>
  );
};
