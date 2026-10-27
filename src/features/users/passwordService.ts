import {supabase} from '@/lib/supabase';
export function validatePasswordChange(oldPassword:string,newPassword:string,confirmation:string){
 if(!oldPassword)return 'Informe sua senha atual.';
 if(newPassword.length<8||newPassword.length>128)return 'A nova senha deve ter de 8 a 128 caracteres.';
 if(newPassword!==confirmation)return 'A confirmação não corresponde à nova senha.';
 if(newPassword===oldPassword)return 'Escolha uma senha diferente da atual.';
 return '';
}
export async function passwordAction(body:Record<string,unknown>){
 if(!supabase)throw new Error('Conexão indisponível.');
 const {data,error}=await supabase.functions.invoke('account-password',{body});
 if(error){let message='Não foi possível concluir a alteração de senha.';try{message=(await error.context?.json())?.message||message;}catch{/* Sem detalhes técnicos ou credenciais. */}throw new Error(message);}
 return data?.message||'Senha alterada com sucesso.';
}
