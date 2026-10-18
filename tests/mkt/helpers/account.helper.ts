import type { APIRequestContext } from '@playwright/test';

export interface 회원정보 {
  loginId: string;
  password: string;
  name: string;
  email: string;
}

export function 새회원정보(): 회원정보 {
  const 꼬리 = `${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`.slice(-8);
  const loginId = `mk${꼬리}`;
  return { loginId, password: `Mk${꼬리}!9`, name: '테스트회원', email: `${loginId}@example.com` };
}

export async function 회원가입요청(요청: APIRequestContext, 정보: 회원정보): Promise<void> {
  const 응답 = await 요청.post('/api/auth/signup', {
    data: {
      loginId: 정보.loginId,
      password: 정보.password,
      passwordConfirm: 정보.password,
      name: 정보.name,
      email: 정보.email,
      terms: true,
      privacy: true,
    },
  });
  if (응답.status() !== 201) throw new Error(`가입 요청이 실패했다: ${응답.status()} ${await 응답.text()}`);
}

export async function 로그인요청(요청: APIRequestContext, loginId: string, password: string, remember = false): Promise<number> {
  const 응답 = await 요청.post('/api/auth/login', { data: { loginId, password, remember } });
  return 응답.status();
}

export async function 새회원으로로그인(요청: APIRequestContext): Promise<회원정보> {
  const 정보 = 새회원정보();
  await 회원가입요청(요청, 정보);
  const 상태 = await 로그인요청(요청, 정보.loginId, 정보.password);
  if (상태 !== 200) throw new Error(`새 회원 로그인이 실패했다: ${상태}`);
  return 정보;
}

export async function 새회원만들기(요청: APIRequestContext): Promise<회원정보> {
  const 정보 = 새회원정보();
  await 회원가입요청(요청, 정보);
  return 정보;
}

export async function 회원정리(요청: APIRequestContext, 정보: 회원정보): Promise<number> {
  await 로그인요청(요청, 정보.loginId, 정보.password);
  const 응답 = await 요청.delete('/api/me', { data: { password: 정보.password } });
  return 응답.status();
}

export async function 로그아웃요청(요청: APIRequestContext): Promise<number> {
  const 응답 = await 요청.post('/api/auth/logout');
  return 응답.status();
}

export async function 기본회원으로로그인(요청: APIRequestContext, 아이디: string, 비밀번호: string): Promise<void> {
  const 상태 = await 로그인요청(요청, 아이디, 비밀번호);
  if (상태 !== 200) throw new Error(`기본 회원 로그인이 실패했다: ${상태}`);
}

export async function 세션회원있는가(요청: APIRequestContext): Promise<boolean> {
  const 응답 = await 요청.get('/api/session');
  if (응답.status() !== 200) throw new Error(`세션 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { user: unknown }).user !== null;
}
