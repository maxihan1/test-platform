import type { APIRequestContext } from '@playwright/test';

export interface 회원정보 {
  loginId: string;
  password: string;
  name: string;
  email: string;
}

export function 계정값(params: { loginId?: string; password?: string }): { loginId: string; password: string } {
  if (!params.loginId || !params.password) throw new Error('테스트 계정 비밀값(loginId · password)이 비어 있다');
  return { loginId: params.loginId, password: params.password };
}

export function 새회원정보(): 회원정보 {
  const 꼬리 = `${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;
  const loginId = `s${꼬리}`;
  return { loginId, password: `Mk${String(Math.floor(Math.random() * 90000) + 10000)}!q`, name: '임시회원', email: `${loginId}@example.com` };
}

export async function 회원가입(api: APIRequestContext, 정보: 회원정보 = 새회원정보()): Promise<회원정보> {
  const res = await api.post('/api/auth/signup', {
    data: {
      loginId: 정보.loginId, password: 정보.password, passwordConfirm: 정보.password, name: 정보.name, email: 정보.email,
      phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false,
    },
  });
  if (res.status() !== 201) throw new Error(`임시 회원 가입 실패: ${String(res.status())} ${await res.text()}`);
  return 정보;
}

export async function API로그인(api: APIRequestContext, loginId: string, password: string): Promise<void> {
  const res = await api.post('/api/auth/login', { data: { loginId, password, remember: false } });
  if (!res.ok()) throw new Error(`API 로그인 실패: ${String(res.status())}`);
}

export async function 새회원으로로그인(api: APIRequestContext): Promise<회원정보> {
  const 정보 = await 회원가입(api);
  await API로그인(api, 정보.loginId, 정보.password);
  return 정보;
}

export async function 탈퇴(api: APIRequestContext): Promise<void> {
  const res = await api.delete('/api/me');
  if (res.status() !== 204 && res.status() !== 401) throw new Error(`임시 회원 탈퇴 실패: ${String(res.status())}`);
}

export async function 로그인한아이디(api: APIRequestContext): Promise<string | null> {
  const res = await api.get('/api/auth/me');
  if (res.status() === 401) return null;
  if (!res.ok()) throw new Error(`내 정보 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { loginId: string }).loginId;
}

export async function 테스트계정으로로그인(api: APIRequestContext, params: { loginId?: string; password?: string }): Promise<void> {
  const 계정 = 계정값(params);
  await API로그인(api, 계정.loginId, 계정.password);
}
