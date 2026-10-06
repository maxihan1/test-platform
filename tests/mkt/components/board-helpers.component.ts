import type { APIRequestContext } from '@playwright/test';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './account.component.js';
import { 글만들기, 글지우기, 댓글달기 } from './data.component.js';
import { png파일 } from './files.component.js';

export class 정리함 {
  private 할일: Array<() => Promise<unknown>> = [];

  더하기(일: () => Promise<unknown>): void {
    this.할일.push(일);
  }

  async 비우기(): Promise<void> {
    let 첫오류: unknown;
    for (const 일 of this.할일.reverse()) {
      try {
        await 일();
      } catch (오류) {
        첫오류 ??= 오류;
      }
    }
    this.할일 = [];
    if (첫오류 !== undefined) throw 첫오류;
  }
}

const 조각 = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');

export function 고유이름(머리: string): string {
  return `${머리}${Date.now().toString(36).slice(-4)}${조각()}`;
}

export const 글본문10자 = '가나다라마바사아자차';

export function 글자(개수: number, 글: string = '가'): string {
  return 글.repeat(Math.ceil(개수 / 글.length)).slice(0, 개수);
}

export function 이미지주소(): string {
  return `data:image/png;base64,${png파일('작은.png').buffer.toString('base64')}`;
}

export async function 회원로그인(api: APIRequestContext, 정리: 정리함): Promise<임시회원> {
  const 회원 = await 임시회원로그인(api);
  정리.더하기(() => 임시회원지우기(api, 회원));
  return 회원;
}

export interface 만든글 {
  id: number;
  title: string;
  content: string;
}

export async function 내글만들기(
  api: APIRequestContext,
  정리: 정리함,
  옵션: { title?: string; content?: string; category?: string; images?: string[] } = {},
): Promise<만든글> {
  const title = 옵션.title ?? 고유이름('글제목');
  const content = 옵션.content ?? `${글본문10자} ${고유이름('본문')}`;
  const { id } = await 글만들기(api, { title, content, category: 옵션.category ?? '자유', images: 옵션.images ?? [] });
  정리.더하기(() => 글지우기(api, id));
  return { id, title, content };
}

export async function 댓글여럿달기(api: APIRequestContext, 글번호: number, 내용들: string[]): Promise<number[]> {
  const 번호들: number[] = [];
  for (const 내용 of 내용들) 번호들.push((await 댓글달기(api, 글번호, 내용)).id);
  return 번호들;
}

export async function 시드글번호(api: APIRequestContext): Promise<number> {
  const res = await api.get('/api/posts?size=50');
  if (!res.ok()) throw new Error(`게시글 목록 요청이 실패했다: ${res.status()}`);
  const { items } = (await res.json()) as { items: Array<{ id: number }> };
  const 시드 = items.find((글) => 글.id < 100);
  if (!시드) throw new Error('기본으로 들어 있는 글이 없다');
  return 시드.id;
}

export interface 글목록행 {
  id: number;
  category: string;
  title: string;
  views: number;
  likes: number;
}

export async function 글목록받기(api: APIRequestContext, 조건: Record<string, string>): Promise<{ notices: 글목록행[]; items: 글목록행[]; total: number }> {
  const res = await api.get(`/api/posts?${new URLSearchParams(조건).toString()}`);
  if (!res.ok()) throw new Error(`게시글 목록 요청이 실패했다: ${res.status()}`);
  return (await res.json()) as { notices: 글목록행[]; items: 글목록행[]; total: number };
}

export async function 글수정요청(api: APIRequestContext, 글번호: number, 제목: string, 본문: string) {
  return api.put(`/api/posts/${글번호}`, { data: { category: '자유', title: 제목, content: 본문, images: [] } });
}

export interface 댓글모양 {
  id: number;
  parentId: number | null;
  content: string;
  deleted: boolean;
}

export async function 댓글목록받기(api: APIRequestContext, 글번호: number): Promise<댓글모양[]> {
  const res = await api.get(`/api/posts/${글번호}/comments`);
  if (!res.ok()) throw new Error(`댓글 목록 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: 댓글모양[] }).items;
}

export function 등록글정리(api: APIRequestContext, 정리: 정리함, 주소: string): number {
  const 번호 = Number(new URL(주소).pathname.split('/').filter(Boolean)[1]);
  if (!Number.isInteger(번호)) throw new Error(`글 상세 주소가 아니다: ${주소}`);
  정리.더하기(() => 글지우기(api, 번호));
  return 번호;
}

export async function 자동완성글자(api: APIRequestContext, 조건: (개수: number) => boolean): Promise<string> {
  const res = await api.get('/api/products?size=100');
  if (!res.ok()) throw new Error(`상품 목록 요청이 실패했다: ${res.status()}`);
  const 이름들 = ((await res.json()) as { items: Array<{ name: string }> }).items.map((상품) => 상품.name.toLowerCase());
  const 후보 = new Set<string>();
  for (const 이름 of 이름들) {
    const 글들 = Array.from(이름.replace(/\s/g, ''));
    글들.forEach((글, 자리) => {
      후보.add(글);
      if (자리 + 1 < 글들.length) 후보.add(`${글}${글들[자리 + 1]}`);
    });
  }
  for (const 글 of 후보) {
    if (조건(이름들.filter((이름) => 이름.includes(글)).length)) return 글;
  }
  throw new Error('조건에 맞는 검색어를 상품 이름에서 찾지 못했다');
}

export async function 세션아이디(api: APIRequestContext): Promise<string> {
  const res = await api.get('/api/session');
  if (!res.ok()) throw new Error(`세션 조회가 실패했다: ${res.status()}`);
  return ((await res.json()) as { user: { loginId: string } | null }).user?.loginId ?? '';
}
