import {supabase} from '@/lib/supabase';
import {validateFileContent} from '@/lib/fileValidation';

export type SupportCredentials={protocol:string;cnpj:string;accessKey:string};
export type SupportMessage={id:string;author:'customer'|'agent'|'system';actor_label?:string;body:string;created_at:string};
export type SupportAttachment={id:string;file_name:string;mime_type:string;size_bytes:number;created_at:string;url:string|null};
export type SupportConversation={protocol:string;queue_id:string;queue_label:string;service_id:string;service_label:string;assigned_name?:string|null;status:'queued'|'assigned'|'in_progress'|'waiting_customer'|'completed'|'cancelled';people_ahead:number;created_at:string;updated_at:string;messages:SupportMessage[];attachments?:SupportAttachment[];has_more?:boolean};
export type OpenSupportResult={protocol:string;queue_id:string;status:SupportConversation['status'];created_at:string;accessKey:string;resumed?:boolean};

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
export const getSupportConversation=(credentials:SupportCredentials,before?:string)=>invoke<SupportConversation>({action:'conversation',...credentials,...(before?{before}:{})});
export const sendSupportMessage=(credentials:SupportCredentials,message:string)=>invoke<SupportMessage>({action:'message',...credentials,message});
export const submitSupportSatisfaction=(credentials:SupportCredentials,score:number,comment:string)=>invoke<{saved:boolean}>({action:'satisfaction',...credentials,score,comment});
export async function uploadSupportAttachment(credentials:SupportCredentials,file:File){
 if(!supabase)throw new Error('A conexão com o atendimento está indisponível.');
 if(file.size>10485760||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('Envie imagem ou PDF de até 10 MB.');
 if(!await validateFileContent(file))throw new Error('O conteúdo do arquivo não corresponde ao formato informado ou contém recursos não permitidos.');
 const prepared=await invoke<{path:string;token:string}>({action:'prepare_attachment',...credentials,fileName:file.name,mimeType:file.type,size:file.size});
 const {error}=await supabase.storage.from('support-attachments').uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:file.type});
 if(error)throw new Error('Não foi possível enviar o arquivo.');
 return invoke({action:'register_attachment',...credentials,fileName:file.name,filePath:prepared.path,mimeType:file.type,size:file.size});
}

const storageKey=(protocol:string)=>`dgsci-support:${protocol.toUpperCase()}`;
const latestStorageKey='dgsci-support:current';
export function saveSupportCredentials(credentials:SupportCredentials){const value=JSON.stringify(credentials);localStorage.setItem(storageKey(credentials.protocol),value);localStorage.setItem(latestStorageKey,value);}
export function loadSupportCredentials(protocol?:string):SupportCredentials|null{try{const value=protocol&&protocol!=='chat'?localStorage.getItem(storageKey(protocol)):localStorage.getItem(latestStorageKey);if(!value)return null;const parsed=JSON.parse(value);return parsed?.protocol&&parsed?.cnpj&&parsed?.accessKey?parsed:null;}catch{return null;}}
