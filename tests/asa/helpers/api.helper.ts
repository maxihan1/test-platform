import type { APIRequestContext, APIResponse } from '@playwright/test';

const 쓸글자 = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const 아이디앞머리 = 'asat';

export function 무작위글자(길이: number): string {
  let 결과 = '';
  for (let i = 0; i < 길이; i += 1) 결과 += 쓸글자[Math.floor(Math.random() * 쓸글자.length)];
  return 결과;
}

export function 새아이디(길이 = 12): string {
  if (길이 <= 아이디앞머리.length) return 무작위글자(길이);
  return 아이디앞머리 + 무작위글자(길이 - 아이디앞머리.length);
}

export function 새비밀번호(길이 = 12): string {
  return 무작위글자(길이);
}

export async function 가입(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return request.post('/auth/signup', { data: { username: 아이디, password: 비밀번호 } });
}

export async function 로그인(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return request.post('/auth/login', { data: { username: 아이디, password: 비밀번호 } });
}

export async function 갱신(request: APIRequestContext, 리프레시토큰: string): Promise<APIResponse> {
  return request.post('/auth/refresh', { data: { refreshToken: 리프레시토큰 } });
}

export async function 본문(응답: APIResponse): Promise<Record<string, unknown>> {
  const 글 = await 응답.text();
  try {
    const 값: unknown = JSON.parse(글);
    return typeof 값 === 'object' && 값 !== null && !Array.isArray(값) ? (값 as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function 오류코드(응답: APIResponse): Promise<string> {
  const 코드 = (await 본문(응답)).code;
  return typeof 코드 === 'string' ? 코드 : '';
}

export async function 글칸(응답: APIResponse, 칸: string): Promise<string> {
  const 값 = (await 본문(응답))[칸];
  return typeof 값 === 'string' ? 값 : '';
}

export async function 칸이름들(응답: APIResponse): Promise<string> {
  return Object.keys(await 본문(응답)).sort().join(', ');
}

export async function 토큰없이부르기(request: APIRequestContext, 방식: string, 경로: string): Promise<APIResponse> {
  return request.fetch(경로, { method: 방식, ...(방식 === 'GET' ? {} : { data: {} }) });
}

export async function 틀린어드민키로부르기(request: APIRequestContext, 방식: string, 경로: string): Promise<APIResponse> {
  return request.fetch(경로, {
    method: 방식,
    headers: { 'X-Admin-Key': `asa-wrong-${무작위글자(16)}` },
    ...(방식 === 'GET' ? {} : { data: {} }),
  });
}
