/**
 * Icon Utility - Feature-rich icon mapping for Lucide React icons
 * 
 * Features:
 * - Comprehensive icon mapping by name, category, and aliases
 * - Case-insensitive lookup
 * - Fallback icon support
 * - Icon categories for organized access
 * - Type-safe icon retrieval
 */

import {
    // Dashboard & Home
    LayoutDashboard, Home, Activity, Gauge, BarChart3,

    // Users & People
    Users, User, UserPlus, UserMinus, UserCog, UserCheck, UserX,
    Contact, CircleUser, PersonStanding,

    // Education
    GraduationCap, School, BookOpen, BookMarked, Library, Notebook,
    PenTool, Pencil, FileEdit, ClipboardList,

    // Students & Classes
    Baby, SchoolIcon, Building2, Blocks, Group, UsersRound,

    // Tasks & Records
    ClipboardCheck, Clipboard, ListChecks, CheckSquare, CheckCircle,
    FileText, File, Files, FolderOpen, Archive,

    // Schedule & Time
    Calendar, CalendarDays, CalendarClock, Clock, Timer, AlarmClock,

    // Finance & Payments
    CreditCard, Wallet, DollarSign, Coins, Banknote, Receipt,
    BadgeDollarSign, PiggyBank,

    // Analytics & Reports
    BarChart, PieChart, LineChart, TrendingUp, TrendingDown,
    ChartBar, ChartPie, ChartLine, AreaChart, Activity as ChartActivity,

    // Infrastructure
    Building, Building2 as Building2Alt, Landmark, Factory,
    FlaskConical, Microscope, Beaker, TestTube,

    // Communication
    Bell, BellRing, BellOff, MessageSquare, MessageCircle, Mail, Send,
    Phone, Video, Megaphone,

    // Work & HR
    Briefcase, BadgeCheck, IdCard, Award, Medal, Star,

    // Security & Admin
    Shield, ShieldCheck, ShieldAlert, Lock, Unlock, Key, KeyRound,
    Eye, EyeOff, Fingerprint,

    // Settings & Config
    Settings, Settings2, Cog, Wrench, SlidersHorizontal, ToggleLeft,

    // Organization
    Folder, FolderClosed, FolderPlus, Layers, Grid3X3,
    LayoutGrid, LayoutList, Menu, List,

    // Navigation
    ChevronRight, ChevronDown, ChevronUp, ChevronLeft,
    ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
    MoveRight, ExternalLink, Link,

    // Status
    CircleDot, Circle, CircleCheck, CircleX, CircleAlert,
    AlertTriangle, AlertCircle, Info, HelpCircle,

    // Actions
    Plus, Minus, X, Check, Edit, Trash2, Download, Upload,
    RefreshCw, RotateCcw, Search, Filter, SortAsc, SortDesc,

    // Media
    Image, ImagePlus, Video as VideoIcon, Camera, Palette,

    // Misc
    Heart, ThumbsUp, ThumbsDown, Bookmark, Tag, Tags,
    Pin, MapPin, Globe, Map, Compass,

    type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Icon Categories
// ============================================================================

export const IconCategories = {
    dashboard: ['LayoutDashboard', 'Home', 'Activity', 'Gauge', 'BarChart3'],
    users: ['Users', 'User', 'UserPlus', 'UserMinus', 'UserCog', 'UserCheck', 'UserX', 'Contact', 'CircleUser'],
    education: ['GraduationCap', 'School', 'BookOpen', 'BookMarked', 'Library', 'Notebook', 'PenTool', 'Pencil'],
    tasks: ['ClipboardCheck', 'Clipboard', 'ListChecks', 'CheckSquare', 'CheckCircle', 'FileText', 'File', 'Files'],
    schedule: ['Calendar', 'CalendarDays', 'CalendarClock', 'Clock', 'Timer', 'AlarmClock'],
    finance: ['CreditCard', 'Wallet', 'DollarSign', 'Coins', 'Banknote', 'Receipt', 'BadgeDollarSign', 'PiggyBank'],
    analytics: ['BarChart', 'PieChart', 'LineChart', 'TrendingUp', 'TrendingDown', 'AreaChart'],
    infrastructure: ['Building', 'Building2', 'Landmark', 'Factory', 'FlaskConical', 'Microscope', 'Beaker'],
    communication: ['Bell', 'BellRing', 'MessageSquare', 'MessageCircle', 'Mail', 'Send', 'Phone', 'Video', 'Megaphone'],
    work: ['Briefcase', 'BadgeCheck', 'IdCard', 'Award', 'Medal', 'Star'],
    security: ['Shield', 'ShieldCheck', 'ShieldAlert', 'Lock', 'Unlock', 'Key', 'KeyRound', 'Eye', 'EyeOff'],
    settings: ['Settings', 'Settings2', 'Cog', 'Wrench', 'SlidersHorizontal', 'ToggleLeft'],
    organization: ['Folder', 'FolderClosed', 'FolderPlus', 'Layers', 'Grid3X3', 'LayoutGrid', 'LayoutList', 'Menu', 'List'],
    navigation: ['ChevronRight', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ArrowRight', 'ArrowLeft'],
    status: ['CircleDot', 'Circle', 'CircleCheck', 'CircleX', 'CircleAlert', 'AlertTriangle', 'AlertCircle', 'Info'],
    actions: ['Plus', 'Minus', 'X', 'Check', 'Edit', 'Trash2', 'Download', 'Upload', 'RefreshCw', 'Search', 'Filter'],
    media: ['Image', 'ImagePlus', 'Video', 'Camera', 'Palette'],
    misc: ['Heart', 'ThumbsUp', 'ThumbsDown', 'Bookmark', 'Tag', 'Tags', 'Pin', 'MapPin', 'Globe', 'Map', 'Compass'],
} as const;

// ============================================================================
// Icon Map - Name to Component
// ============================================================================

export const iconMap: Record<string, LucideIcon> = {
    // -------------------------
    // Dashboard & Home
    // -------------------------
    'LayoutDashboard': LayoutDashboard,
    'layoutdashboard': LayoutDashboard,
    'dashboard': LayoutDashboard,
    'Home': Home,
    'home': Home,
    'Activity': Activity,
    'activity': Activity,
    'Gauge': Gauge,
    'gauge': Gauge,
    'overview': LayoutDashboard,

    // -------------------------
    // Users & People
    // -------------------------
    'Users': Users,
    'users': Users,
    'User': User,
    'user': User,
    'profile': User,
    'UserPlus': UserPlus,
    'userplus': UserPlus,
    'user-plus': UserPlus,
    'add-user': UserPlus,
    'UserMinus': UserMinus,
    'userminus': UserMinus,
    'user-minus': UserMinus,
    'UserCog': UserCog,
    'usercog': UserCog,
    'user-settings': UserCog,
    'user-management': UserCog,
    'UserCheck': UserCheck,
    'usercheck': UserCheck,
    'Contact': Contact,
    'contact': Contact,
    'contacts': Contact,
    'CircleUser': CircleUser,
    'circleuser': CircleUser,
    'avatar': CircleUser,

    // -------------------------
    // Education
    // -------------------------
    'GraduationCap': GraduationCap,
    'graduationcap': GraduationCap,
    'graduation': GraduationCap,
    'teachers': GraduationCap,
    'graduate': GraduationCap,
    'School': School,
    'school': School,
    'classes': School,
    'class': School,
    'institution': School,
    'BookOpen': BookOpen,
    'bookopen': BookOpen,
    'academics': BookOpen,
    'courses': BookOpen,
    'course': BookOpen,
    'subjects': BookOpen,
    'subject': BookOpen,
    'curriculum': BookOpen,
    'BookMarked': BookMarked,
    'bookmarked': BookMarked,
    'syllabus': BookMarked,
    'Library': Library,
    'library': Library,
    'Notebook': Notebook,
    'notebook': Notebook,
    'notes': Notebook,
    'PenTool': PenTool,
    'pentool': PenTool,
    'assignments': PenTool,
    'homework': PenTool,

    // -------------------------
    // Students
    // -------------------------
    'students': Users,
    'student': User,
    'pupil': User,
    'learner': User,

    // -------------------------
    // Tasks & Records
    // -------------------------
    'ClipboardCheck': ClipboardCheck,
    'clipboardcheck': ClipboardCheck,
    'attendance': ClipboardCheck,
    'tasks': ClipboardCheck,
    'task': ClipboardCheck,
    'checklist': ClipboardCheck,
    'Clipboard': Clipboard,
    'clipboard': Clipboard,
    'ListChecks': ListChecks,
    'listchecks': ListChecks,
    'todo': ListChecks,
    'FileText': FileText,
    'filetext': FileText,
    'exams': FileText,
    'exam': FileText,
    'documents': FileText,
    'document': FileText,
    'tests': FileText,
    'test': FileText,
    'results': FileText,
    'File': File,
    'file': File,
    'Files': Files,
    'files': Files,
    'FolderOpen': FolderOpen,
    'folderopen': FolderOpen,
    'Archive': Archive,
    'archive': Archive,
    'records': Archive,

    // -------------------------
    // Schedule & Time
    // -------------------------
    'Calendar': Calendar,
    'calendar': Calendar,
    'CalendarDays': CalendarDays,
    'calendardays': CalendarDays,
    'schedule': CalendarDays,
    'schedules': CalendarDays,
    'timetable': CalendarDays,
    'CalendarClock': CalendarClock,
    'calendarclock': CalendarClock,
    'Clock': Clock,
    'clock': Clock,
    'time': Clock,
    'Timer': Timer,
    'timer': Timer,
    'AlarmClock': AlarmClock,
    'alarmclock': AlarmClock,
    'reminder': AlarmClock,
    'reminders': AlarmClock,

    // -------------------------
    // Finance & Payments
    // -------------------------
    'CreditCard': CreditCard,
    'creditcard': CreditCard,
    'fees': CreditCard,
    'fee': CreditCard,
    'payments': CreditCard,
    'payment': CreditCard,
    'billing': CreditCard,
    'Wallet': Wallet,
    'wallet': Wallet,
    'DollarSign': DollarSign,
    'dollarsign': DollarSign,
    'money': DollarSign,
    'finance': DollarSign,
    'financial': DollarSign,
    'Coins': Coins,
    'coins': Coins,
    'Banknote': Banknote,
    'banknote': Banknote,
    'cash': Banknote,
    'Receipt': Receipt,
    'receipt': Receipt,
    'invoice': Receipt,
    'invoices': Receipt,
    'BadgeDollarSign': BadgeDollarSign,
    'badgedollarsign': BadgeDollarSign,
    'salary': BadgeDollarSign,
    'salaries': BadgeDollarSign,
    'payroll': BadgeDollarSign,

    // -------------------------
    // Analytics & Reports
    // -------------------------
    'BarChart': BarChart,
    'barchart': BarChart,
    'analytics': BarChart,
    'reports': BarChart,
    'report': BarChart,
    'statistics': BarChart,
    'stats': BarChart,
    'PieChart': PieChart,
    'piechart': PieChart,
    'LineChart': LineChart,
    'linechart': LineChart,
    'trends': LineChart,
    'TrendingUp': TrendingUp,
    'trendingup': TrendingUp,
    'growth': TrendingUp,
    'progress': TrendingUp,
    'TrendingDown': TrendingDown,
    'trendingdown': TrendingDown,
    'decline': TrendingDown,
    'grades': BarChart,
    'grade': BarChart,
    'performance': BarChart,
    'AreaChart': AreaChart,
    'areachart': AreaChart,

    // -------------------------
    // Infrastructure
    // -------------------------
    'Building': Building,
    'building': Building,
    'infrastructure': Building,
    'campus': Building,
    'Building2': Building2,
    'building2': Building2,
    'departments': Building2,
    'department': Building2,
    'Landmark': Landmark,
    'landmark': Landmark,
    'Factory': Factory,
    'factory': Factory,
    'FlaskConical': FlaskConical,
    'flaskconical': FlaskConical,
    'lab': FlaskConical,
    'labs': FlaskConical,
    'laboratory': FlaskConical,
    'laboratories': FlaskConical,
    'science': FlaskConical,
    'Microscope': Microscope,
    'microscope': Microscope,
    'research': Microscope,

    // -------------------------
    // Communication
    // -------------------------
    'Bell': Bell,
    'bell': Bell,
    'notifications': Bell,
    'notification': Bell,
    'alerts': Bell,
    'alert': Bell,
    'BellRing': BellRing,
    'bellring': BellRing,
    'MessageSquare': MessageSquare,
    'messagesquare': MessageSquare,
    'messages': MessageSquare,
    'message': MessageSquare,
    'chat': MessageSquare,
    'MessageCircle': MessageCircle,
    'messagecircle': MessageCircle,
    'comments': MessageCircle,
    'comment': MessageCircle,
    'Mail': Mail,
    'mail': Mail,
    'email': Mail,
    'emails': Mail,
    'inbox': Mail,
    'Send': Send,
    'send': Send,
    'Phone': Phone,
    'phone': Phone,
    'call': Phone,
    'Video': VideoIcon,
    'video': VideoIcon,
    'Megaphone': Megaphone,
    'megaphone': Megaphone,
    'announcements': Megaphone,
    'announcement': Megaphone,
    'broadcast': Megaphone,

    // -------------------------
    // Work & HR
    // -------------------------
    'Briefcase': Briefcase,
    'briefcase': Briefcase,
    'staff': Briefcase,
    'work': Briefcase,
    'job': Briefcase,
    'jobs': Briefcase,
    'employment': Briefcase,
    'hr': Briefcase,
    'BadgeCheck': BadgeCheck,
    'badgecheck': BadgeCheck,
    'verified': BadgeCheck,
    'certification': BadgeCheck,
    'IdCard': IdCard,
    'idcard': IdCard,
    'id': IdCard,
    'identity': IdCard,
    'employee': IdCard,
    'employees': IdCard,
    'Award': Award,
    'award': Award,
    'awards': Award,
    'achievement': Award,
    'achievements': Award,
    'Medal': Medal,
    'medal': Medal,
    'medals': Medal,
    'Star': Star,
    'star': Star,
    'rating': Star,
    'ratings': Star,
    'favorite': Star,
    'favorites': Star,

    // -------------------------
    // Security & Admin
    // -------------------------
    'Shield': Shield,
    'shield': Shield,
    'security': Shield,
    'admin': Shield,
    'administration': Shield,
    'ShieldCheck': ShieldCheck,
    'shieldcheck': ShieldCheck,
    'secure': ShieldCheck,
    'protected': ShieldCheck,
    'ShieldAlert': ShieldAlert,
    'shieldalert': ShieldAlert,
    'Lock': Lock,
    'lock': Lock,
    'locked': Lock,
    'private': Lock,
    'Unlock': Unlock,
    'unlock': Unlock,
    'unlocked': Unlock,
    'Key': Key,
    'key': Key,
    'keys': Key,
    'permissions': Key,
    'permission': Key,
    'access': Key,
    'KeyRound': KeyRound,
    'keyround': KeyRound,
    'Eye': Eye,
    'eye': Eye,
    'view': Eye,
    'visible': Eye,
    'EyeOff': EyeOff,
    'eyeoff': EyeOff,
    'hidden': EyeOff,
    'invisible': EyeOff,

    // -------------------------
    // Settings & Config
    // -------------------------
    'Settings': Settings,
    'settings': Settings,
    'preferences': Settings,
    'config': Settings,
    'configuration': Settings,
    'options': Settings,
    'Settings2': Settings2,
    'settings2': Settings2,
    'Cog': Cog,
    'cog': Cog,
    'gear': Cog,
    'Wrench': Wrench,
    'wrench': Wrench,
    'tools': Wrench,
    'maintenance': Wrench,
    'SlidersHorizontal': SlidersHorizontal,
    'slidershorizontal': SlidersHorizontal,
    'controls': SlidersHorizontal,
    'sliders': SlidersHorizontal,

    // -------------------------
    // Organization
    // -------------------------
    'Folder': Folder,
    'folder': Folder,
    'category': Folder,
    'categories': Folder,
    'FolderClosed': FolderClosed,
    'folderclosed': FolderClosed,
    'FolderPlus': FolderPlus,
    'folderplus': FolderPlus,
    'Layers': Layers,
    'layers': Layers,
    'modules': Layers,
    'module': Layers,
    'sections': Layers,
    'section': Layers,
    'Grid3X3': Grid3X3,
    'grid3x3': Grid3X3,
    'grid': Grid3X3,
    'LayoutGrid': LayoutGrid,
    'layoutgrid': LayoutGrid,
    'gallery': LayoutGrid,
    'LayoutList': LayoutList,
    'layoutlist': LayoutList,
    'Menu': Menu,
    'menu': Menu,
    'hamburger': Menu,
    'List': List,
    'list': List,

    // -------------------------
    // Status Icons
    // -------------------------
    'CircleDot': CircleDot,
    'circledot': CircleDot,
    'active': CircleDot,
    'Circle': Circle,
    'circle': Circle,
    'CircleCheck': CircleCheck,
    'circlecheck': CircleCheck,
    'success': CircleCheck,
    'complete': CircleCheck,
    'completed': CircleCheck,
    'approved': CircleCheck,
    'CircleX': CircleX,
    'circlex': CircleX,
    'error': CircleX,
    'failed': CircleX,
    'rejected': CircleX,
    'CircleAlert': CircleAlert,
    'circlealert': CircleAlert,
    'AlertTriangle': AlertTriangle,
    'alerttriangle': AlertTriangle,
    'warning': AlertTriangle,
    'caution': AlertTriangle,
    'AlertCircle': AlertCircle,
    'alertcircle': AlertCircle,
    'Info': Info,
    'info': Info,
    'information': Info,
    'about': Info,
    'HelpCircle': HelpCircle,
    'helpcircle': HelpCircle,
    'help': HelpCircle,
    'support': HelpCircle,
    'faq': HelpCircle,

    // -------------------------
    // Actions
    // -------------------------
    'Plus': Plus,
    'plus': Plus,
    'add': Plus,
    'create': Plus,
    'new': Plus,
    'Minus': Minus,
    'minus': Minus,
    'remove': Minus,
    'X': X,
    'x': X,
    'close': X,
    'cancel': X,
    'Check': Check,
    'check': Check,
    'confirm': Check,
    'done': Check,
    'Edit': Edit,
    'edit': Edit,
    'modify': Edit,
    'update': Edit,
    'Trash2': Trash2,
    'trash2': Trash2,
    'trash': Trash2,
    'delete': Trash2,
    'Download': Download,
    'download': Download,
    'export': Download,
    'Upload': Upload,
    'upload': Upload,
    'import': Upload,
    'RefreshCw': RefreshCw,
    'refreshcw': RefreshCw,
    'refresh': RefreshCw,
    'reload': RefreshCw,
    'sync': RefreshCw,
    'RotateCcw': RotateCcw,
    'rotateccw': RotateCcw,
    'undo': RotateCcw,
    'reset': RotateCcw,
    'Search': Search,
    'search': Search,
    'find': Search,
    'lookup': Search,
    'Filter': Filter,
    'filter': Filter,
    'filters': Filter,
    'SortAsc': SortAsc,
    'sortasc': SortAsc,
    'sort': SortAsc,
    'ascending': SortAsc,
    'SortDesc': SortDesc,
    'sortdesc': SortDesc,
    'descending': SortDesc,

    // -------------------------
    // Media
    // -------------------------
    'Image': Image,
    'image': Image,
    'photo': Image,
    'photos': Image,
    'picture': Image,
    'pictures': Image,
    'ImagePlus': ImagePlus,
    'imageplus': ImagePlus,
    'Camera': Camera,
    'camera': Camera,
    'Palette': Palette,
    'palette': Palette,
    'theme': Palette,
    'themes': Palette,
    'design': Palette,
    'appearance': Palette,

    // -------------------------
    // Navigation
    // -------------------------
    'ChevronRight': ChevronRight,
    'chevronright': ChevronRight,
    'ChevronDown': ChevronDown,
    'chevrondown': ChevronDown,
    'ChevronUp': ChevronUp,
    'chevronup': ChevronUp,
    'ChevronLeft': ChevronLeft,
    'chevronleft': ChevronLeft,
    'ArrowRight': ArrowRight,
    'arrowright': ArrowRight,
    'next': ArrowRight,
    'ArrowLeft': ArrowLeft,
    'arrowleft': ArrowLeft,
    'back': ArrowLeft,
    'previous': ArrowLeft,
    'ArrowUp': ArrowUp,
    'arrowup': ArrowUp,
    'ArrowDown': ArrowDown,
    'arrowdown': ArrowDown,
    'ExternalLink': ExternalLink,
    'externallink': ExternalLink,
    'external': ExternalLink,
    'Link': Link,
    'link': Link,
    'links': Link,

    // -------------------------
    // Misc
    // -------------------------
    'Heart': Heart,
    'heart': Heart,
    'like': Heart,
    'love': Heart,
    'ThumbsUp': ThumbsUp,
    'thumbsup': ThumbsUp,
    'approve': ThumbsUp,
    'ThumbsDown': ThumbsDown,
    'thumbsdown': ThumbsDown,
    'disapprove': ThumbsDown,
    'Bookmark': Bookmark,
    'bookmark': Bookmark,
    'saved': Bookmark,
    'save': Bookmark,
    'Tag': Tag,
    'tag': Tag,
    'label': Tag,
    'Tags': Tags,
    'tags': Tags,
    'labels': Tags,
    'Pin': Pin,
    'pin': Pin,
    'pinned': Pin,
    'MapPin': MapPin,
    'mappin': MapPin,
    'location': MapPin,
    'address': MapPin,
    'Globe': Globe,
    'globe': Globe,
    'world': Globe,
    'international': Globe,
    'website': Globe,
    'Map': Map,
    'map': Map,
    'Compass': Compass,
    'compass': Compass,
    'direction': Compass,
    'navigate': Compass,
};

// ============================================================================
// Default and Fallback Icons
// ============================================================================

export const DefaultIcon = LayoutDashboard;
export const FallbackIcon = Folder;

// ============================================================================
// Get Icon Function
// ============================================================================

/**
 * Get a Lucide icon component by name
 * 
 * @param iconName - The icon name (case-insensitive)
 * @param fallback - Optional fallback icon (default: Folder)
 * @returns The Lucide icon component
 * 
 * @example
 * ```tsx
 * const Icon = getIcon('dashboard');
 * const Icon = getIcon('academics');
 * const Icon = getIcon('students', Users);
 * const Icon = getIcon(undefined); // Returns DefaultIcon
 * ```
 */
export function getIcon(iconName?: string, fallback: LucideIcon = FallbackIcon): LucideIcon {
    if (!iconName) return DefaultIcon;

    // Direct lookup
    if (iconMap[iconName]) return iconMap[iconName];

    // Lowercase lookup
    const lowerName = iconName.toLowerCase();
    if (iconMap[lowerName]) return iconMap[lowerName];

    // Kebab-case to camelCase lookup
    const camelName = lowerName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (iconMap[camelName]) return iconMap[camelName];

    return fallback;
}

/**
 * Check if an icon name exists in the map
 */
export function hasIcon(iconName: string): boolean {
    return iconName in iconMap || iconName.toLowerCase() in iconMap;
}

/**
 * Get all icon names in a category
 */
export function getIconsByCategory(category: keyof typeof IconCategories): string[] {
    return IconCategories[category] as unknown as string[];
}

/**
 * Get all available icon names
 */
export function getAllIconNames(): string[] {
    return Object.keys(iconMap);
}

/**
 * Get unique icon names (excluding aliases)
 */
export function getUniqueIconNames(): string[] {
    const seen = new Set<LucideIcon>();
    const uniqueNames: string[] = [];

    for (const [name, icon] of Object.entries(iconMap)) {
        if (!seen.has(icon)) {
            seen.add(icon);
            // Prefer PascalCase names
            if (name[0] === name[0].toUpperCase()) {
                uniqueNames.push(name);
            }
        }
    }

    return uniqueNames;
}

// Export types
export type { LucideIcon };
