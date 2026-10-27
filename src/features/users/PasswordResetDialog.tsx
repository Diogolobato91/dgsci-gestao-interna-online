import {useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {ActionButton} from '@/components/workspace/Workspace';
import type {ManagedUser} from './types';
import {passwordAction} from './passwordService';
export default function PasswordResetDialog({account,onClose,onSaved}:{account:ManagedUser;onClose:()=>void;onSaved:(message:string)=>void}){
 const [confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="record-dialog compact-dialog"><DialogHeader><DialogTitle>Resetar senha</DialogTitle><DialogDescription>{account.display_name} · {account.email}</DialogDescription></DialogHeader><form className="record-form" onSubmit={async e=>{e.preventDefault();if(busy||confirmation!==account.email)return;setBusy(true);setError('');try{const message=await passwordAction({action:'reset',targetId:account.user_id,email:account.email,version:account.version,confirmation});onSaved(message);onClose();}catch(e){setError(e instanceof Error?e.message:'Não foi possível resetar a senha.');}finally{setBusy(false);}}}>
 <p className="delete-warning">A senha desta conta será substituída por <strong>12345678</strong>. Oriente o usuário a alterá-la em Minha conta. Setores, permissões e situação cadastral serão preservados.</p><div className="form-field"><label htmlFor="reset-password-email">Digite o e-mail da conta para confirmar *</label><input id="reset-password-email" type="email" autoComplete="off" required disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="record-actions"><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" variant="primary" disabled={busy||confirmation!==account.email}><LockKeyhole size={16}/>{busy?'Resetando…':'Confirmar reset'}</ActionButton></div></form></DialogContent></Dialog>;
}
