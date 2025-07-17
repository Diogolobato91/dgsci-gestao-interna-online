import { UserProfile } from './auth';

export interface MenuItem {
  id: string;
  title: string;
  icon: any;
  path: string;
  section?: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export type MenuConfig = Record<UserProfile, MenuItem[]>;