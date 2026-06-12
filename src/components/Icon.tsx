/**
 * Icon — thin wrapper over lucide-react that maps the handoff's short icon
 * names to Lucide components. Screens reference icons by the handoff name
 * (e.g. "trend", "chevL", "drop") so they never import Lucide directly.
 */
import {
  Home,
  List,
  TrendingUp,
  User,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  Droplet,
  Calendar,
  FlaskConical,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'home'
  | 'list'
  | 'trend'
  | 'user'
  | 'plus'
  | 'bell'
  | 'chevL'
  | 'chevR'
  | 'pencil'
  | 'check'
  | 'drop'
  | 'cal'
  | 'flask'
  | 'spark';

const MAP: Record<IconName, LucideIcon> = {
  home: Home,
  list: List,
  trend: TrendingUp,
  user: User,
  plus: Plus,
  bell: Bell,
  chevL: ChevronLeft,
  chevR: ChevronRight,
  pencil: Pencil,
  check: Check,
  drop: Droplet,
  cal: Calendar,
  flask: FlaskConical,
  spark: Sparkles,
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, className, color, strokeWidth = 2 }: IconProps) {
  const Cmp = MAP[name];
  return <Cmp size={size} className={className} color={color} strokeWidth={strokeWidth} />;
}
