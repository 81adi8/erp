import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  Rocket, 
  HeartHandshake, 
  Headphones,
  Wrench,
  GraduationCap,
  ArrowRight,
  Check,
  Clock,
  Users,
  Target,
  BarChart
} from 'lucide-react';
import { Section, SectionHeader, Card, Button, Badge } from '@components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem, GlowingOrb } from '@components/animations';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: Lightbulb,
    name: 'Consulting & Strategy',
    description: 'Our experts work with you to understand your unique needs and develop a tailored implementation strategy.',
    details: [
      'Needs Assessment',
      'Gap Analysis',
      'Roadmap Planning',
      'Change Management',
    ],
    color: 'primary',
  },
  {
    icon: Rocket,
    name: 'Implementation',
    description: 'End-to-end implementation services including data migration, configuration, and go-live support.',
    details: [
      'System Configuration',
      'Data Migration',
      'Integration Setup',
      'Go-Live Support',
    ],
    color: 'secondary',
  },
  {
    icon: GraduationCap,
    name: 'Training & Adoption',
    description: 'Comprehensive training programs to ensure your team gets the most out of EduERP.',
    details: [
      'Admin Training',
      'Teacher Workshops',
      'Video Tutorials',
      'Documentation',
    ],
    color: 'success',
  },
  {
    icon: Headphones,
    name: '24/7 Support',
    description: 'Round-the-clock support via phone, email, and chat. We are here whenever you need us.',
    details: [
      'Phone Support',
      'Email Support',
      'Live Chat',
      'Ticket System',
    ],
    color: 'warning',
  },
  {
    icon: Wrench,
    name: 'Customization',
    description: 'Tailor EduERP to your exact requirements with custom modules, reports, and workflows.',
    details: [
      'Custom Modules',
      'Report Builder',
      'Workflow Automation',
      'API Development',
    ],
    color: 'error',
  },
  {
    icon: HeartHandshake,
    name: 'Managed Services',
    description: 'Let our team handle the day-to-day administration so you can focus on education.',
    details: [
      'System Monitoring',
      'Regular Updates',
      'Backup Management',
      'Security Audits',
    ],
    color: 'info',
  },
];

const processSteps = [
  {
    step: '01',
    title: 'Discovery',
    description: 'We learn about your institution, goals, and challenges through detailed consultations.',
    icon: Target,
  },
  {
    step: '02',
    title: 'Planning',
    description: 'Our team creates a customized implementation plan with clear milestones and timelines.',
    icon: BarChart,
  },
  {
    step: '03',
    title: 'Implementation',
    description: 'We configure, migrate data, and set up integrations according to the plan.',
    icon: Wrench,
  },
  {
    step: '04',
    title: 'Training',
    description: 'Comprehensive training ensures your team is confident and ready to use the system.',
    icon: Users,
  },
  {
    step: '05',
    title: 'Launch',
    description: 'We support you through go-live and monitor the system for a smooth transition.',
    icon: Rocket,
  },
  {
    step: '06',
    title: 'Ongoing Support',
    description: 'Continuous support and optimization to ensure long-term success.',
    icon: Headphones,
  },
];

export const ServicesPage = () => {
  return (
    <>
      {/* Hero */}
      <Section className="pt-32 relative overflow-hidden">
        <GlowingOrb className="-top-40 -right-40" color="var(--color-primary)" size={500} />
        <GlowingOrb className="bottom-0 -left-40" color="var(--color-secondary)" size={400} />
        
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="primary" className="mb-4">Our Services</Badge>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-text mb-6">
              Expert Support at
              <span className="block text-gradient">Every Step</span>
            </h1>
            <p className="text-lg text-text-secondary">
              From initial consultation to ongoing support, our team of education technology experts is here to ensure your success.
            </p>
          </div>
        </ScrollReveal>
      </Section>

      {/* Services Grid */}
      <Section>
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <StaggerItem key={service.name}>
              <Card className="h-full group">
                <div className={`w-14 h-14 rounded-2xl bg-${service.color}/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className={`w-7 h-7 text-${service.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold text-text mb-3">{service.name}</h3>
                <p className="text-text-secondary mb-6">{service.description}</p>
                
                <ul className="space-y-2">
                  {service.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-success flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* Process Section */}
      <Section className="bg-surface-hover">
        <ScrollReveal>
          <SectionHeader
            badge="Our Process"
            title="How We Work With You"
            description="A proven methodology that ensures successful implementation and adoption."
          />
        </ScrollReveal>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processSteps.map((step, index) => (
              <ScrollReveal key={step.step} delay={index * 0.1}>
                <div className="relative text-center">
                  <div className="relative z-10 w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-mixed flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-text mb-2">{step.title}</h3>
                  <p className="text-text-secondary">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Section>

      {/* SLA Section */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left">
            <div>
              <Badge variant="secondary" className="mb-4">Service Level Agreement</Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">
                Committed to Your Success
              </h2>
              <p className="text-text-secondary mb-6">
                We back our service with industry-leading SLAs to ensure you always have the support you need.
              </p>
              
              <div className="space-y-4">
                {[
                  { label: 'System Uptime', value: '99.9%' },
                  { label: 'Critical Issue Response', value: '< 1 Hour' },
                  { label: 'Standard Issue Response', value: '< 4 Hours' },
                  { label: 'Feature Requests Review', value: '< 48 Hours' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="font-semibold text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="right">
            <div className="relative">
              <Card glass className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-mixed flex items-center justify-center">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text">24/7</h3>
                    <p className="text-text-secondary">Support Available</p>
                  </div>
                </div>
                <p className="text-text-secondary mb-6">
                  Our global support team is available around the clock to assist you with any issues or questions.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Phone', 'Email', 'Chat', 'Ticket'].map((channel) => (
                    <span key={channel} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {channel}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <ScrollReveal>
          <div className="text-center bg-gradient-mixed rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Contact us today to discuss how our services can help your institution succeed.
            </p>
            <Link to="/contact">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Contact Us <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </Section>
    </>
  );
};
