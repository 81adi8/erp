import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Play,
  Sparkles,
  GraduationCap,
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Clock,
  Award,
  CheckCircle2,
  Star,
  Quote
} from 'lucide-react';
import {
  Section,
  SectionHeader,
  Button,
  Card,
  Badge
} from '@components/ui';
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  CountUp,
  FloatingElement,
  GlowingOrb
} from '@components/animations';

// Hero Section
const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      <GlowingOrb className="top-20 -left-40" color="var(--color-primary)" size={500} />
      <GlowingOrb className="bottom-20 -right-40" color="var(--color-secondary)" size={400} />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="primary" className="mb-6">
                <Sparkles className="w-3 h-3 mr-1" />
                #1 India Education Management Platform
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6"
            >
              Transform Your
              <span className="block text-gradient">Educational Institution</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg lg:text-xl text-text-secondary mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Streamline administration, enhance learning experiences, and empower educators with our comprehensive ERP solution designed for modern schools.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/contact">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center gap-6 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-2 text-text-secondary">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm">No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm">14-day free trial</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm">Cancel anytime</span>
              </div>
            </motion.div>
          </div>

          {/* 3D Visual */}
          <div className="relative hidden lg:block">
            <FloatingElement duration={6} distance={15}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                {/* Dashboard Preview Card */}
                <div className="relative bg-surface/80 backdrop-blur-xl rounded-3xl border border-border shadow-2xl p-6 transform perspective-1000 rotate-y-[-5deg] rotate-x-[5deg]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-error" />
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>

                  {/* Mock Dashboard */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-mixed flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="h-3 w-24 bg-text/20 rounded" />
                          <div className="h-2 w-16 bg-text/10 rounded mt-1" />
                        </div>
                      </div>
                      <div className="h-8 w-20 bg-primary/20 rounded-lg" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 rounded-xl bg-surface-hover">
                          <div className="h-8 w-8 rounded-lg bg-primary/20 mb-2" />
                          <div className="h-6 w-12 bg-text/20 rounded mb-1" />
                          <div className="h-2 w-full bg-text/10 rounded" />
                        </div>
                      ))}
                    </div>

                    <div className="h-32 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-end p-4">
                      <div className="flex items-end gap-2 w-full">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-primary/40 rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-8 -right-8 p-4 bg-surface rounded-2xl border border-border shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Active Students</p>
                      <p className="font-bold text-text">2,847</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [10, -10, 10] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -bottom-4 -left-8 p-4 bg-surface rounded-2xl border border-border shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Performance</p>
                      <p className="font-bold text-success">+24%</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </FloatingElement>
          </div>
        </div>
      </div>
    </section>
  );
};

// Features Section
const features = [
  {
    icon: Users,
    title: 'Student Management',
    description: 'Complete student lifecycle management from admission to graduation with detailed profiles and tracking.',
    color: 'primary',
  },
  {
    icon: BookOpen,
    title: 'Academic Planning',
    description: 'Curriculum design, lesson planning, and resource allocation made simple and efficient.',
    color: 'secondary',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Real-time insights and comprehensive reports to make data-driven decisions.',
    color: 'success',
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Enterprise-grade security with GDPR, FERPA compliance and role-based access control.',
    color: 'warning',
  },
  {
    icon: Zap,
    title: 'Fast & Reliable',
    description: '99.9% uptime guarantee with lightning-fast performance across all devices.',
    color: 'info',
  },
  {
    icon: Globe,
    title: 'Multi-Campus Support',
    description: 'Manage multiple campuses and branches from a single unified dashboard.',
    color: 'error',
  },
];

const colorStyles = {
  primary: { container: 'bg-primary/10', icon: 'text-primary' },
  secondary: { container: 'bg-secondary/10', icon: 'text-secondary' },
  success: { container: 'bg-success/10', icon: 'text-success' },
  warning: { container: 'bg-warning/10', icon: 'text-warning' },
  info: { container: 'bg-info/10', icon: 'text-info' },
  error: { container: 'bg-error/10', icon: 'text-error' },
} as const;

const FeaturesSection = () => {
  return (
    <Section id="features" className="relative">
      <GlowingOrb className="-top-40 left-1/2 -translate-x-1/2" color="var(--color-secondary)" size={600} />

      <ScrollReveal>
        <SectionHeader
          badge="Features"
          title="Everything You Need to Succeed"
          description="Powerful tools designed specifically for educational institutions to streamline operations and enhance learning outcomes."
        />
      </ScrollReveal>

      <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {features.map((feature, index) => {
          const styles = colorStyles[feature.color as keyof typeof colorStyles];
          return (
            <StaggerItem key={feature.title}>
              <Card className="h-full group">
                <div className={`w-14 h-14 rounded-2xl ${styles.container} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 ${styles.icon}`} />
                </div>
                <h3 className="text-xl font-semibold text-text mb-3">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </Section>
  );
};

// Stats Section
const stats = [
  { value: 500, suffix: '+', label: 'Schools Trust Us' },
  { value: 1, suffix: 'M+', label: 'Students Managed' },
  { value: 50, suffix: '+', label: 'Countries' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
];

const StatsSection = () => {
  return (
    <Section className="relative bg-gradient-mixed">
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {stats.map((stat, index) => (
          <ScrollReveal key={stat.label} delay={index * 0.1}>
            <div className="text-center">
              <div className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-white/80 text-sm lg:text-base">{stat.label}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
};

// Testimonials Section
const testimonials = [
  {
    quote: "EduERP has transformed how we manage our school. The intuitive interface and powerful features have saved us countless hours.",
    author: "Dr. Sarah Chen",
    role: "Principal, Westside Academy",
    rating: 5,
  },
  {
    quote: "The analytics dashboard gives us insights we never had before. We can now make data-driven decisions that truly impact student success.",
    author: "Michael Rodriguez",
    role: "Director of Operations, Lincoln Schools",
    rating: 5,
  },
  {
    quote: "Implementation was seamless and the support team is exceptional. It's rare to find a product that delivers on all its promises.",
    author: "Emily Thompson",
    role: "IT Administrator, Brighton College",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <Section id="testimonials" className="relative overflow-hidden">
      <GlowingOrb className="-bottom-40 -right-40" color="var(--color-primary)" size={400} />

      <ScrollReveal>
        <SectionHeader
          badge="Testimonials"
          title="Loved by Educators Worldwide"
          description="See what school administrators and educators are saying about EduERP."
        />
      </ScrollReveal>

      <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {testimonials.map((testimonial, index) => (
          <StaggerItem key={testimonial.author}>
            <Card className="h-full relative">
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10" />

              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                ))}
              </div>

              <p className="text-text-secondary mb-6 relative z-10">"{testimonial.quote}"</p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-mixed flex items-center justify-center text-white font-bold">
                  {testimonial.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-text">{testimonial.author}</p>
                  <p className="text-sm text-text-secondary">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
};

// CTA Section
const CTASection = () => {
  return (
    <Section className="relative">
      <div className="relative bg-gradient-mixed rounded-3xl p-8 lg:p-16 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative text-center">
          <ScrollReveal>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4">
              Ready to Transform Your Institution?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of schools already using EduERP to streamline their operations and enhance learning outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </Section>
  );
};

// Main HomePage Component
export const HomePage = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
};
