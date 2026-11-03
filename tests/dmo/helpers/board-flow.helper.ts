import type { APIRequestContext, Page } from '@playwright/test';

import { 브라우저, 회원가입, 회원창, type 일회용회원 } from './account.helper.js';
import { 글숨기기, 문의답변하기 } from './ops-data.helper.js';
import { 글쓰기, 글지우기, 댓글쓰기, 문의남기기 } from './shop-data.helper.js';

export class 정리함 {
  private readonly 할일: Array<() => Promise<void>> = [];

  더하기(할일: () => Promise<void>): void {
    this.할일.push(할일);
  }

  async 비우기(): Promise<void> {
    const 순서 = this.할일.splice(0).reverse();
    for (const 할일 of 순서) {
      try {
        await 할일();
      } catch (오류) {
        console.error(`[정리 실패] ${오류 instanceof Error ? 오류.message : String(오류)}`);
      }
    }
  }
}

export const 시험문의내용 = '시험으로 남긴 문의 내용입니다';

export const 꼬리 = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function 임의글자(길이: number): string {
  let 글 = '';
  for (let i = 0; i < 길이; i += 1) 글 += String.fromCharCode(0xac00 + Math.floor(Math.random() * 11172));
  return 글;
}

export const 글자수맞추기 = (길이: number): string => '가나다라마바사아자차'.repeat(Math.ceil(길이 / 10)).slice(0, 길이);

export { 브라우저 } from './account.helper.js';

export interface 회원마당 {
  회원: 일회용회원;
  창: Page;
}

export async function 회원마당열기(관리자창: Page, request: APIRequestContext, 정리: 정리함): Promise<회원마당> {
  const 회원 = await 회원가입(request);
  const 창 = await 회원창(브라우저(관리자창), 회원.loginId, 회원.password);
  정리.더하기(() => 창.context().close());
  return { 회원, 창 };
}

export interface 만든글 {
  id: number;
  title: string;
}

export async function 글만들기(마당: 회원마당, 관리자창: Page, 정리: 정리함, 분류 = '자유'): Promise<만든글> {
  const title = `시험글 ${꼬리()}`;
  const { id } = await 글쓰기(마당.창, title, '시험으로 쓴 글의 본문입니다', 분류);
  정리.더하기(async () => {
    await 글숨기기(관리자창, id, false);
    await 글지우기(마당.창, id);
  });
  return { id, title };
}

export interface 만든댓글 {
  id: number;
  content: string;
}

export async function 댓글만들기(마당: 회원마당, 글번호: number, 내용: string): Promise<만든댓글> {
  const { id } = await 댓글쓰기(마당.창, 글번호, 내용);
  return { id, content: 내용 };
}

export interface 만든문의 {
  id: number;
  title: string;
}

export async function 문의만들기(마당: 회원마당, 관리자창: Page, 정리: 정리함, 답변?: string): Promise<만든문의> {
  const title = `시험 문의 ${꼬리()}`;
  const { id } = await 문의남기기(마당.창, title, 시험문의내용);
  정리.더하기(() => 문의답변하기(관리자창, id, '시험을 마치고 남긴 답변'));
  if (답변 !== undefined) await 문의답변하기(관리자창, id, 답변);
  return { id, title };
}

export interface 찾은공지 {
  id: number;
  title: string;
  hidden: boolean;
}

export async function 공지찾기(관리자창: Page, title: string): Promise<찾은공지[]> {
  const 응답 = await 관리자창.request.get(`/api/ops/posts?view=&category=${encodeURIComponent('공지')}&q=${encodeURIComponent(title)}`);
  if (!응답.ok()) throw new Error(`공지 목록 읽기 실패 ${응답.status()} ${await 응답.text()}`);
  const 몸 = (await 응답.json()) as { items: 찾은공지[] };
  return 몸.items.filter((글) => 글.title === title);
}

export function 공지숨길등록(관리자창: Page, title: string, 정리: 정리함): void {
  정리.더하기(async () => {
    for (const 글 of await 공지찾기(관리자창, title)) {
      if (!글.hidden) await 글숨기기(관리자창, 글.id, true);
    }
  });
}
