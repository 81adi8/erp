import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  FileText,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  Shield,
  Smartphone,
  ArrowRight,
  Check
} from 'lucide-react';
import { Section, SectionHeader, Card, Button, Badge } from '@components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem, GlowingOrb } from '@components/animations';
import { Link } from 'react-router-dom';

const products = [
  {
    icon: Users,
    name: 'Student Information System',
    description: 'Comprehensive student management from enrollment to graduation. Track academic progress, attendance, and personal details.',
    features: ['Student Profiles', 'Enrollment Management', 'Transfer & Graduation', 'Parent Portal'],
    color: 'primary',
    popular: true,
  },
  {
    icon: BookOpen,
    name: 'Academic Management',
    description: 'Plan and manage curriculum, courses, and academic schedules with ease. Assign teachers and track progress.',
    features: ['Curriculum Planning', 'Course Management', 'Grade Books', 'Report Cards'],
    color: 'secondary',
  },
  {
    icon: Calendar,
    name: 'Timetable & Scheduling',
    description: 'Automated timetable generation with conflict detection. Manage substitutions and room allocations effortlessly.',
    features: ['Auto-Generation', 'Conflict Detection', 'Room Booking', 'Substitutions'],
    color: 'success',
  },
  {
    icon: CreditCard,
    name: 'Fee Management',
    description: 'Complete financial management with online payments, invoicing, and comprehensive financial reports.',
    features: ['Online Payments', 'Fee Structures', 'Scholarships', 'Financial Reports'],
    color: 'warning',
  },
  {
    icon: FileText,
    name: 'Examination Portal',
    description: 'End-to-end examination management from scheduling to result publication with analytics.',
    features: ['Exam Scheduling', 'Online Tests', 'Auto-Grading', 'Result Analysis'],
    color: 'error',
  },
  {
    icon: BarChart3,
    name: 'Analytics Dashboard',
    description: 'Real-time insights and comprehensive reports to make data-driven decisions for your institution.',
    features: ['Custom Reports', 'Data Visualization', 'Trend Analysis', 'Export Options'],
    color: 'info',
  },
  {
    icon: Bell,
    name: 'Communication Hub',
    description: 'Unified communication platform for announcements, notifications, and parent-teacher interaction.',
    features: ['Push Notifications', 'Email/SMS', 'Announcements', 'Parent Chat'],
    color: 'primary',
  },
  {
    icon: MessageSquare,
    name: 'Learning Management',
    description: 'Digital learning platform with content delivery, assignments, and interactive learning tools.',
    features: ['Content Library', 'Assignments', 'Video Classes', 'Progress Tracking'],
    color: 'secondary',
  },
  {
    icon: Shield,
    name: 'Access Control',
    description: 'Role-based access control with comprehensive audit trails and security compliance.',
    features: ['Role Management', 'Permissions', 'Audit Logs', 'GDPR Compliance'],
    color: 'success',
  },
];

const ProductCard = ({ product, index }: { product: typeof products[0]; index: number }) => {
  return (
    <Card className="h-full relative overflow-hidden group">
      {product.popular && (
        <div className="absolute top-4 right-4">
          <Badge variant="primary">Popular</Badge>
        </div>
      )}
      
      <div className={`w-14 h-14 rounded-2xl bg-${product.color}/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <product.icon className={`w-7 h-7 text-${product.color}`} />
      </div>
      
      <h3 className="text-xl font-semibold text-text mb-3">{product.name}</h3>
      <p className="text-text-secondary mb-6">{product.description}</p>
      
      <ul className="space-y-2 mb-6">
        {product.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
            <Check className="w-4 h-4 text-success flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      
      <Link to="/contact" className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
        Learn More <ArrowRight className="w-4 h-4" />
      </Link>
    </Card>
  );
};

export const ProductsPage = () => {
  return (
    <>
      {/* Hero */}
      <Section className="pt-32 relative overflow-hidden">
        <GlowingOrb className="-top-40 -left-40" color="var(--color-primary)" size={500} />
        <GlowingOrb className="top-20 -right-40" color="var(--color-secondary)" size={400} />
        
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="primary" className="mb-4">Our Products</Badge>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-text mb-6">
              Powerful Modules for
              <span className="block text-gradient">Every Need</span>
            </h1>
            <p className="text-lg text-text-secondary">
              Our comprehensive suite of modules covers every aspect of educational institution management. Mix and match to create your perfect solution.
            </p>
          </div>
        </ScrollReveal>
      </Section>

      {/* Products Grid */}
      <Section>
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, index) => (
            <StaggerItem key={product.name}>
              <ProductCard product={product} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* Integration Section */}
      <Section className="bg-surface-hover">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left">
            <div>
              <Badge variant="secondary" className="mb-4">Integrations</Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">
                Works With Your Existing Tools
              </h2>
              <p className="text-text-secondary mb-6">
                EduERP seamlessly integrates with popular third-party services including payment gateways, communication platforms, and learning tools.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {['Google Workspace', 'Microsoft 365', 'Zoom', 'Stripe', 'PayPal', 'Twilio'].map((tool) => (
                  <div key={tool} className="flex items-center gap-2 text-text-secondary">
                    <Check className="w-5 h-5 text-success" />
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="right">
            <div className="relative">
              <div className="grid grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="aspect-square bg-surface rounded-2xl border border-border flex items-center justify-center p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-mixed opacity-20" />
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <ScrollReveal>
          <div className="text-center bg-gradient-mixed rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Ready to Explore Our Products?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Get a personalized demo and see how EduERP can transform your institution.
            </p>
            <Link to="/contact">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Request Demo <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </Section>
    </>
  );
};
