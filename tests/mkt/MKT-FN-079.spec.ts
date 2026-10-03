import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';
import { 글쓰기 } from './pages/board-write.page.js';

const 작은png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64');

const 새회원비밀번호 = 'Mkt!2026pw';

async function 가입한다(request: APIRequestContext): Promise<string> {
  const 아이디 = `mk${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 5)}`;
  const res = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 새회원비밀번호,
      passwordConfirm: 새회원비밀번호,
      name: '시험회원',
      email: `${아이디}@example.com`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (res.status() !== 201) throw new Error(`가입 응답이 ${res.status()}이다`);
  return 아이디;
}

async function 치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  await request.post('/api/auth/login', { data: { loginId: 아이디, password: 새회원비밀번호 } });
  const 나 = (await (await request.get('/api/session')).json()) as { user: { id: number } | null };
  const 목록 = (await (await request.get('/api/posts?field=author&q=시험회원&size=100')).json()) as { items: { id: number; authorId: number }[] };
  for (const 글 of 목록.items) {
    if (글.authorId === 나.user?.id) await request.delete(`/api/posts/${글.id}`);
  }
  await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-079',
  name: '글을 등록하면 방금 쓴 글의 상세로 가서 토스트와 첨부 이미지가 보인다',
  platforms: ['desktop'],
  precondition: ['일반 회원이 로그인해 있다', '글쓰기 화면이다'],
  params: z.object({
    category: z.string().min(1).describe('글 분류').default('자유'),
    title: z.string().min(1).describe('글 제목').default('등록 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('등록 시험용 본문입니다. 열 글자를 넘깁니다.'),
  }),
  expected: z.object({
    toast: z.string().describe('등록 안내 문구').default('등록되었습니다'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);
  const 상세 = new 게시글상세(page);
  const 알림 = new 토스트(page);
  const 아이디 = await 가입한다(request);

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글쓰기 화면을 연다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면을 확인한다', async () => {
      await verify('일반 회원이 로그인해 있다', [await 머리.로그아웃.isVisible(), await 쓰기.제목칸.isVisible()].join(', '), 'true, true', { blocker: true });
    });

    await test.step('분류 · 제목 · 본문을 적고 이미지 한 장을 올려 「등록」을 누른다', async () => {
      await 쓰기.채운다(params.category, params.title, params.content);
      await 쓰기.이미지입력.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: 작은png });
      await 쓰기.미리보기.first().waitFor();
      await 쓰기.등록.click();
      await 상세.제목.waitFor();
      await verify('등록하면 방금 쓴 글의 상세로 간다', [/^\/board\/\d+$/.test(new URL(page.url()).pathname), await 상세.제목.innerText()].join(', '), `true, ${params.title}`);
      await verify('등록하면 토스트 「등록되었습니다」가 보인다', await 알림.문구(expected.toast).innerText(), expected.toast);
      await verify('첨부한 이미지가 글 상세에 보인다', await 상세.첨부이미지.first().isVisible(), true);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
