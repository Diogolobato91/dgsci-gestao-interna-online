import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from './activity';
export default function ActivityTracker(){
 const {user}=useAuth();const {pathname}=useLocation();
 useEffect(()=>{if(user?.id)void logActivity('session_open');},[user?.id]);
 useEffect(()=>{if(user?.id)void logActivity('page_view',pathname);},[user?.id,pathname]);
 return null;
}
