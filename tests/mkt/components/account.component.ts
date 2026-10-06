import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface 임시회원 {
  loginId: string;
  password: string;
  name: string;
  email: string;
}

const 조각 = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');

export function 임시회원정보(): 임시회원 {
  const loginId = `mk${Date.now().toString(36).slice(-6)}${조각()}`.slice(0, 12);
  return {
    loginId,
    password: `Mk!${조각()}${조각()}7`,
    name: `임시${조각()}`,
    email: `${loginId}@example.com`,
  };
}

export async function 가입요청(api: APIRequestContext, 회원: 임시회원): Promise<APIResponse> {
  return api.post('/api/auth/signup', {
    data: {
      loginId: 회원.loginId,
      password: 회원.password,
      passwordConfirm: 회원.password,
      name: 회원.name,
      email: 회원.email,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
}

export async function 임시회원가입(api: APIRequestContext, 회원: 임시회원 = 임시회원정보()): Promise<임시회원> {
  const res = await 가입요청(api, 회원);
  if (res.status() !== 201) throw new Error(`임시 회원 가입이 실패했다: ${res.status()} ${await res.text()}`);
  return 회원;
}

export async function 로그인요청(api: APIRequestContext, loginId: string, password: string, remember = false): Promise<APIResponse> {
  return api.post('/api/auth/login', { data: { loginId, password, remember } });
}

export async function API로그인(api: APIRequestContext, loginId: string, password: string, remember = false): Promise<void> {
  const res = await 로그인요청(api, loginId, password, remember);
  if (res.status() !== 200) throw new Error(`API 로그인이 실패했다: ${res.status()} ${await res.text()}`);
}

export async function 임시회원로그인(api: APIRequestContext): Promise<임시회원> {
  const 회원 = await 임시회원가입(api);
  await API로그인(api, 회원.loginId, 회원.password);
  return 회원;
}

export async function 로그아웃요청(api: APIRequestContext): Promise<APIResponse> {
  return api.post('/api/auth/logout');
}

export async function 임시회원지우기(api: APIRequestContext, 회원: 임시회원): Promise<number> {
  await 로그인요청(api, 회원.loginId, 회원.password);
  const res = await api.delete('/api/me');
  return res.status();
}

export interface 테스트계정 {
  loginId: string;
  password: string;
}

export function 테스트계정값(입력: { loginId?: string | undefined; password?: string | undefined }): 테스트계정 {
  if (!입력.loginId || !입력.password) throw new Error('테스트 계정 값이 없다');
  return { loginId: 입력.loginId, password: 입력.password };
}

export function 관리자계정값(입력: { adminLoginId: string; adminPassword?: string | undefined }): 테스트계정 {
  if (!입력.adminLoginId || !입력.adminPassword) throw new Error('관리자 계정 값이 없다');
  return { loginId: 입력.adminLoginId, password: 입력.adminPassword };
}

export async function 틀린로그인(api: APIRequestContext, loginId: string, 횟수: number): Promise<number> {
  let 마지막 = 0;
  for (let i = 0; i < 횟수; i += 1) {
    const res = await 로그인요청(api, loginId, 'Wrong!pw0');
    마지막 = res.status();
  }
  return 마지막;
}

export async function 아이디사용중인가(api: APIRequestContext, loginId: string): Promise<boolean> {
  const res = await api.get(`/api/auth/check-id?loginId=${encodeURIComponent(loginId)}`);
  const 본문 = (await res.json()) as { available: boolean };
  return !본문.available;
}

export function 새이름(): string {
  return `고침${Math.random().toString(36).slice(2, 6).padEnd(4, '0')}`;
}
