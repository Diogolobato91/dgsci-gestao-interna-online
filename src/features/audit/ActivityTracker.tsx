import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from './activity';
export default function ActivityTracker(){
 const {user}=useAuth();
 useEffect(()=>{if(user?.id)void logActivity('session_open');},[user?.id]);
 return null;
}
