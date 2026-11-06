import {supabase} from '@/lib/supabase';
export type Publication={id:string;kind:'booklet'|'technical_instruction';title:string;description:string;file_path:string;cover_path:string;active:boolean;sort_order:number;created_at:string};
export async function listPublications(kind:Publication['kind'],includeInactive=false){if(!supabase)return[];let query=supabase.from('publications').select('*').eq('kind',kind).order('sort_order').order('title');if(!includeInactive)query=query.eq('active',true);const{data,error}=await query;if(error)throw error;return(data||[])as Publication[];}
export function publicationUrl(path:string){return supabase?.storage.from('publications').getPublicUrl(path).data.publicUrl||'';}
