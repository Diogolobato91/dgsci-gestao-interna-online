import { useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';

const profiles: UserProfile[] = ['Vistoria', 'Análise', 'Multas', 'ADM', 'Subdiretoria', 'Diretoria'];
export default function LoginForm() {
  const { login } = useAuth();
  const [profile, setProfile] = useState<UserProfile>('Diretoria');
  return <main className="preview-entry"><section><img src="/portal/assets/mark.svg" alt="DGSCI" width="54" height="54" /><p className="portal-eyebrow">DGSCI / CBMPA</p><h1>Uma base comum.<br /><span>Várias áreas conectadas.</span></h1><p>Prévia da integração entre gestão interna, biblioteca de apoio e consulta territorial.</p><form onSubmit={async event => { event.preventDefault(); await login('Prévia DGSCI', 'demonstracao', profile); }}><label htmlFor="preview-profile">Escolha o setor para explorar a prévia</label><select id="preview-profile" value={profile} onChange={event => setProfile(event.target.value as UserProfile)}>{profiles.map(value => <option key={value}>{value}</option>)}</select><button type="submit">Explorar o portal <ArrowRight size={18} /></button></form><div className="entry-disclaimer"><LockKeyhole size={16} /><p>A seleção demonstra a navegação por setor. Contas individuais e permissões reais ainda serão implementadas. Não informe credenciais do SISGAT nesta prévia.</p></div></section></main>;
}
