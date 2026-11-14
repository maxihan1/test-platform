import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 이동주소, 웹로그인, 일회용회원만들기, type 일회용회원 } from './web.helper.js';

const 엔티티: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©' };

export function 글자풀기(글: string): string {
  return 글
    .replace(/&#x([0-9a-f]+);/gi, (_m, 값: string) => String.fromCodePoint(parseInt(값, 16)))
    .replace(/&#(\d+);/g, (_m, 값: string) => String.fromCodePoint(Number(값)))
    .replace(/&([a-z]+);/gi, (m, 이름: string) => 엔티티[이름.toLowerCase()] ?? m);
}

function 주석뺀틀(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '');
}

function 영역(html: string, 태그: string): string {
  return new RegExp(`<${태그}[\\s>][\\s\\S]*?</${태그}>`, 'i').exec(주석뺀틀(html))?.[0] ?? '';
}

function 줄글(조각: string): string {
  return 글자풀기(조각.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function 조각들(영역글: string): string[] {
  return 영역글
    .replace(/<input[^>]*type="submit"[^>]*value="([^"]*)"[^>]*>/gi, '<b>$1</b>')
    .split(/<[^>]*>/)
    .map((조각) => 줄글(조각))
    .filter((조각) => 조각 !== '');
}

export function 제목글(html: string): string {
  return 줄글(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
}

export function 화면글들(html: string): string[] {
  return 조각들(영역(html, 'main'));
}

export function 화면전체글(html: string): string {
  return 줄글(영역(html, 'main'));
}

export function 큰제목들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => 줄글(m[1] ?? ''));
}

export function 링크글들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => 줄글(m[1] ?? ''));
}

export function 머리글링크들(html: string): string[] {
  return [...영역(html, 'header').matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => 줄글(m[1] ?? ''));
}

export function 바닥글(html: string): string {
  return 줄글(영역(html, 'footer'));
}

export function 버튼글들(html: string): string[] {
  const 본문 = 영역(html, 'main');
  const 제출칸 = [...본문.matchAll(/<input[^>]*type="submit"[^>]*value="([^"]*)"[^>]*>/gi)].map((m) => 글자풀기(m[1] ?? ''));
  const 단추 = [...본문.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => 줄글(m[1] ?? ''));
  return [...제출칸, ...단추].filter((글) => 글 !== '');
}

export function 입력칸이름들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<input[^>]*\sname="([^"]*)"/gi)].map((m) => m[1] ?? '');
}

export function 읽기전용칸인가(html: string, 칸아이디: string): boolean {
  const 칸 = new RegExp(`<input[^>]*id="${칸아이디}"[^>]*>`, 'i').exec(영역(html, 'main'))?.[0] ?? '';
  return /\sreadonly[\s>=/]/i.test(칸);
}

export function 검증오류글들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<span[^>]*field-validation-error[^>]*>([\s\S]*?)<\/span>/gi)].map((m) => 줄글(m[1] ?? '')).filter((글) => 글 !== '');
}

export function 빨간알림글들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<(div|span|p|h\d|li)[^>]*class="[^"]*(?:alert-danger|text-danger)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => 줄글(m[2] ?? ''))
    .filter((글) => 글 !== '');
}

export function 목록줄글들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<li[^>]*list-group-item[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => 줄글(m[1] ?? ''));
}

export function 내용칸글들(html: string): string[] {
  return [...영역(html, 'main').matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>/gi)].map((m) => 줄글(m[1] ?? ''));
}

export function 이동경로(응답: APIResponse): string {
  return decodeURIComponent(이동주소(응답));
}

export async function 쿠키머리(request: APIRequestContext): Promise<string> {
  const 상태 = await request.storageState();
  return 상태.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

export function 기호섞인아이디(길이: number): string {
  const 머리 = `qa_tmp_${Date.now()}`;
  const 기호 = '-_.!@#$';
  let 글 = 머리;
  while (글.length < 길이) 글 += 기호[글.length % 기호.length] ?? '-';
  return 글.slice(0, 길이);
}

export async function 일회용회원로그인(request: APIRequestContext): Promise<{ 회원: 일회용회원; 로그인: APIResponse }> {
  const 회원 = await 일회용회원만들기(request);
  const 로그인 = await 웹로그인(request, 회원.아이디, 회원.비밀번호);
  return { 회원, 로그인 };
}
