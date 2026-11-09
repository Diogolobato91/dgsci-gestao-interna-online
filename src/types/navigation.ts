import { UserProfile } from './auth';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  path: string;
  section?: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export type MenuConfig = Record<UserProfile, MenuItem[]>;
