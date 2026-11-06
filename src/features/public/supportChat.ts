import {supabase} from '@/lib/supabase';

export type SupportCredentials={protocol:string;cnpj:string;accessKey:string};
export type SupportMessage={id:string;author:'customer'|'agent'|'system';body:string;created_at:string};
export type SupportConversation={protocol:string;queue_id:string;queue_label:string;service_id:string;service_label:string;status:'queued'|'assigned'|'in_progress'|'waiting_customer'|'completed'|'cancelled';people_ahead:number;created_at:string;updated_at:string;messages:SupportMessage[]};
export type OpenSupportResult={protocol:string;queue_id:string;status:SupportConversation['status'];created_at:string;accessKey:string};

async function invoke<T>(body:Record<string,unknown>):Promise<T>{
 if(!supabase)throw new Error('A conexão com o atendimento está indisponível.');
 const {data,error}=await supabase.functions.invoke('support-chat',{body});
 if(error){
  let message='Não foi possível acessar o atendimento.';
  try{const context=(error as {context?:Response}).context;if(context){const payload=await context.clone().json();if(payload?.message)message=payload.message;}}catch{/* resposta sem JSON */}
  throw new Error(message);
 }
 return data as T;
}

export const openSupportTicket=(input:{service:string;cnpj:string;requester:string;phone:string;email:string;city:string;reference:string;summary:string})=>invoke<OpenSupportResult>({action:'open',...input});
export const getSupportConversation=(credentials:SupportCredentials)=>invoke<SupportConversation>({action:'conversation',...credentials});
export const sendSupportMessage=(credentials:SupportCredentials,message:string)=>invoke<SupportMessage>({action:'message',...credentials,message});

const storageKey=(protocol:string)=>`dgsci-support:${protocol.toUpperCase()}`;
export function saveSupportCredentials(credentials:SupportCredentials){localStorage.setItem(storageKey(credentials.protocol),JSON.stringify(credentials));}
export function loadSupportCredentials(protocol:string):SupportCredentials|null{try{const value=localStorage.getItem(storageKey(protocol));if(!value)return null;const parsed=JSON.parse(value);return parsed?.protocol&&parsed?.cnpj&&parsed?.accessKey?parsed:null;}catch{return null;}}
