import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 본문글 } from './api.helper.js';

export interface 일회용회원 {
  아이디: string;
  비밀번호: string;
  이메일: string;
  가입상태: number;
}

export function 위조방지토큰(html: string): string {
  return /name="__RequestVerificationToken"[^>]*value="([^"]*)"/.exec(html)?.[1] ?? '';
}

export function 이동주소(응답: APIResponse): string {
  const 주소 = 응답.headers()['location'] ?? '';
  return 주소 === '' ? '' : new URL(주소, 'http://x').pathname + new URL(주소, 'http://x').search;
}

export async function 화면글(request: APIRequestContext, 주소: string): Promise<{ status: number; html: string }> {
  const 응답 = await request.get(주소, { maxRedirects: 0 });
  return { status: 응답.status(), html: await 본문글(응답) };
}

export async function 폼토큰(request: APIRequestContext, 주소: string): Promise<string> {
  return 위조방지토큰((await 화면글(request, 주소)).html);
}

export async function 웹로그인(request: APIRequestContext, 아이디: string, 비밀번호: string, 덧질의 = ''): Promise<APIResponse> {
  const 토큰 = await 폼토큰(request, '/');
  return request.post(`/Account/Login${덧질의}`, {
    form: { username: 아이디, password: 비밀번호, __RequestVerificationToken: 토큰 },
    maxRedirects: 0,
  });
}

export async function 가입제출(
  request: APIRequestContext,
  칸: { userName: string; email: string; password: string; repeatPassword?: string; 토큰빼기?: boolean },
): Promise<APIResponse> {
  const 토큰 = 칸.토큰빼기 === true ? '' : await 폼토큰(request, '/Account/Create');
  const form: Record<string, string> = {
    UserName: 칸.userName,
    Email: 칸.email,
    password: 칸.password,
    repeatpassword: 칸.repeatPassword ?? 칸.password,
  };
  if (토큰 !== '') form.__RequestVerificationToken = 토큰;
  return request.post('/Account/Create', { form, maxRedirects: 0 });
}

export function 일회용아이디(): string {
  return `qa_tmp_${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

export async function 일회용회원만들기(request: APIRequestContext): Promise<일회용회원> {
  const 아이디 = 일회용아이디();
  const 비밀번호 = `Qa${Math.floor(Math.random() * 1_000_000)}x!`;
  const 이메일 = `${아이디}@example.invalid`;
  const 응답 = await 가입제출(request, { userName: 아이디, email: 이메일, password: 비밀번호 });
  return { 아이디, 비밀번호, 이메일, 가입상태: 응답.status() };
}

export async function 비밀번호바꾸기제출(
  request: APIRequestContext,
  칸: { oldPassword: string; newPassword: string; confirmPassword?: string },
): Promise<APIResponse> {
  const 토큰 = await 폼토큰(request, '/Account/ChangePassword');
  return request.post('/Account/ChangePassword', {
    form: {
      OldPassword: 칸.oldPassword,
      NewPassword: 칸.newPassword,
      ConfirmPassword: 칸.confirmPassword ?? 칸.newPassword,
      __RequestVerificationToken: 토큰,
    },
    maxRedirects: 0,
  });
}

export function 숨은계정번호(html: string): number {
  return Number(/name="Id" value="(\d+)"/.exec(html)?.[1] ?? '0');
}

export async function 정보수정제출(request: APIRequestContext, 칸: { email: string; id?: number }): Promise<APIResponse> {
  const 폼 = await 화면글(request, '/Account/Edit');
  const 아이디 = /id="UserName" name="UserName" value="([^"]*)"/.exec(폼.html)?.[1] ?? '';
  return request.post('/Account/Edit', {
    form: {
      Id: String(칸.id ?? 숨은계정번호(폼.html)),
      UserName: 아이디,
      Email: 칸.email,
      __RequestVerificationToken: 위조방지토큰(폼.html),
    },
    maxRedirects: 0,
  });
}
