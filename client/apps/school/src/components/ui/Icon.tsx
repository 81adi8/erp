/**
 * Optimized Icon Component
 * 
 * Uses dynamic imports to load only the icons that are actually used.
 * This prevents the entire lucide-react library from being bundled.
 * 
 * Usage:
 *   import { Icon } from '@/components/ui/Icon';
 *   <Icon name="Home" className="w-4 h-4" />
 */

import React, { lazy, Suspense, ComponentType, SVGProps } from 'react';
import { Loader2 } from 'lucide-react';

// Icon names type for type safety
export type IconName = 
  | 'Home'
  | 'Users'
  | 'User'
  | 'Settings'
  | 'Bell'
  | 'Calendar'
  | 'BookOpen'
  | 'GraduationCap'
  | 'ClipboardList'
  | 'FileText'
  | 'DollarSign'
  | 'CreditCard'
  | 'BarChart3'
  | 'PieChart'
  | 'TrendingUp'
  | 'TrendingDown'
  | 'Check'
  | 'X'
  | 'Plus'
  | 'Minus'
  | 'Edit'
  | 'Trash2'
  | 'Eye'
  | 'EyeOff'
  | 'Lock'
  | 'Unlock'
  | 'LogIn'
  | 'LogOut'
  | 'Menu'
  | 'ChevronLeft'
  | 'ChevronRight'
  | 'ChevronDown'
  | 'ChevronUp'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Search'
  | 'Filter'
  | 'Download'
  | 'Upload'
  | 'Printer'
  | 'Mail'
  | 'Phone'
  | 'MapPin'
  | 'Clock'
  | 'AlertCircle'
  | 'AlertTriangle'
  | 'Info'
  | 'HelpCircle'
  | 'CheckCircle'
  | 'XCircle'
  | 'Loader2'
  | 'RefreshCw'
  | 'Save'
  | 'Send'
  | 'MessageSquare'
  | 'MoreHorizontal'
  | 'MoreVertical';

// Icon props
export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

// Icon map with lazy loading
const iconMap: Record<IconName, React.LazyExoticComponent<ComponentType<SVGProps<SVGSVGElement>>>> = {
  Home: lazy(() => import('lucide-react').then(m => ({ default: m.Home }))),
  Users: lazy(() => import('lucide-react').then(m => ({ default: m.Users }))),
  User: lazy(() => import('lucide-react').then(m => ({ default: m.User }))),
  Settings: lazy(() => import('lucide-react').then(m => ({ default: m.Settings }))),
  Bell: lazy(() => import('lucide-react').then(m => ({ default: m.Bell }))),
  Calendar: lazy(() => import('lucide-react').then(m => ({ default: m.Calendar }))),
  BookOpen: lazy(() => import('lucide-react').then(m => ({ default: m.BookOpen }))),
  GraduationCap: lazy(() => import('lucide-react').then(m => ({ default: m.GraduationCap }))),
  ClipboardList: lazy(() => import('lucide-react').then(m => ({ default: m.ClipboardList }))),
  FileText: lazy(() => import('lucide-react').then(m => ({ default: m.FileText }))),
  DollarSign: lazy(() => import('lucide-react').then(m => ({ default: m.DollarSign }))),
  CreditCard: lazy(() => import('lucide-react').then(m => ({ default: m.CreditCard }))),
  BarChart3: lazy(() => import('lucide-react').then(m => ({ default: m.BarChart3 }))),
  PieChart: lazy(() => import('lucide-react').then(m => ({ default: m.PieChart }))),
  TrendingUp: lazy(() => import('lucide-react').then(m => ({ default: m.TrendingUp }))),
  TrendingDown: lazy(() => import('lucide-react').then(m => ({ default: m.TrendingDown }))),
  Check: lazy(() => import('lucide-react').then(m => ({ default: m.Check }))),
  X: lazy(() => import('lucide-react').then(m => ({ default: m.X }))),
  Plus: lazy(() => import('lucide-react').then(m => ({ default: m.Plus }))),
  Minus: lazy(() => import('lucide-react').then(m => ({ default: m.Minus }))),
  Edit: lazy(() => import('lucide-react').then(m => ({ default: m.Edit }))),
  Trash2: lazy(() => import('lucide-react').then(m => ({ default: m.Trash2 }))),
  Eye: lazy(() => import('lucide-react').then(m => ({ default: m.Eye }))),
  EyeOff: lazy(() => import('lucide-react').then(m => ({ default: m.EyeOff }))),
  Lock: lazy(() => import('lucide-react').then(m => ({ default: m.Lock }))),
  Unlock: lazy(() => import('lucide-react').then(m => ({ default: m.Unlock }))),
  LogIn: lazy(() => import('lucide-react').then(m => ({ default: m.LogIn }))),
  LogOut: lazy(() => import('lucide-react').then(m => ({ default: m.LogOut }))),
  Menu: lazy(() => import('lucide-react').then(m => ({ default: m.Menu }))),
  ChevronLeft: lazy(() => import('lucide-react').then(m => ({ default: m.ChevronLeft }))),
  ChevronRight: lazy(() => import('lucide-react').then(m => ({ default: m.ChevronRight }))),
  ChevronDown: lazy(() => import('lucide-react').then(m => ({ default: m.ChevronDown }))),
  ChevronUp: lazy(() => import('lucide-react').then(m => ({ default: m.ChevronUp }))),
  ArrowLeft: lazy(() => import('lucide-react').then(m => ({ default: m.ArrowLeft }))),
  ArrowRight: lazy(() => import('lucide-react').then(m => ({ default: m.ArrowRight }))),
  Search: lazy(() => import('lucide-react').then(m => ({ default: m.Search }))),
  Filter: lazy(() => import('lucide-react').then(m => ({ default: m.Filter }))),
  Download: lazy(() => import('lucide-react').then(m => ({ default: m.Download }))),
  Upload: lazy(() => import('lucide-react').then(m => ({ default: m.Upload }))),
  Printer: lazy(() => import('lucide-react').then(m => ({ default: m.Printer }))),
  Mail: lazy(() => import('lucide-react').then(m => ({ default: m.Mail }))),
  Phone: lazy(() => import('lucide-react').then(m => ({ default: m.Phone }))),
  MapPin: lazy(() => import('lucide-react').then(m => ({ default: m.MapPin }))),
  Clock: lazy(() => import('lucide-react').then(m => ({ default: m.Clock }))),
  AlertCircle: lazy(() => import('lucide-react').then(m => ({ default: m.AlertCircle }))),
  AlertTriangle: lazy(() => import('lucide-react').then(m => ({ default: m.AlertTriangle }))),
  Info: lazy(() => import('lucide-react').then(m => ({ default: m.Info }))),
  HelpCircle: lazy(() => import('lucide-react').then(m => ({ default: m.HelpCircle }))),
  CheckCircle: lazy(() => import('lucide-react').then(m => ({ default: m.CheckCircle }))),
  XCircle: lazy(() => import('lucide-react').then(m => ({ default: m.XCircle }))),
  Loader2: lazy(() => import('lucide-react').then(m => ({ default: m.Loader2 }))),
  RefreshCw: lazy(() => import('lucide-react').then(m => ({ default: m.RefreshCw }))),
  Save: lazy(() => import('lucide-react').then(m => ({ default: m.Save }))),
  Send: lazy(() => import('lucide-react').then(m => ({ default: m.Send }))),
  MessageSquare: lazy(() => import('lucide-react').then(m => ({ default: m.MessageSquare }))),
  MoreHorizontal: lazy(() => import('lucide-react').then(m => ({ default: m.MoreHorizontal }))),
  MoreVertical: lazy(() => import('lucide-react').then(m => ({ default: m.MoreVertical }))),
};

// Default loading fallback
const DefaultFallback = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <Loader2 
    size={size} 
    className={`animate-spin ${className}`} 
    aria-hidden="true"
  />
);

/**
 * Icon component with lazy loading
 * Only loads the specific icon needed, reducing bundle size
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  className = '', 
  fallback,
  ...props 
}) => {
  const LazyIcon = iconMap[name];
  
  if (!LazyIcon) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return (
    <Suspense fallback={fallback || <DefaultFallback size={size} className={className} />}>
      <LazyIcon size={size} className={className} {...props} />
    </Suspense>
  );
};

// Named exports for commonly used icons (direct import for critical path)
export { Loader2 } from 'lucide-react';

export default Icon;