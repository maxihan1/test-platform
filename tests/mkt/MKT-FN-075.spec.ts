import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 글쓰기 } from './pages/board-write.page.js';

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
  tcId: 'MKT-FN-075',
  name: '글쓰기에서 제목 · 본문 한도를 넘기면 잘리고 너무 짧으면 등록되지 않는다',
  platforms: ['desktop'],
  precondition: ['일반 회원이 로그인해 있다', '글쓰기 화면이다'],
  params: z.object({
    category: z.string().min(1).describe('글 분류').default('자유'),
    goodTitle: z.string().min(1).describe('정상 제목').default('시험용 글 제목입니다'),
    goodContent: z.string().min(1).describe('정상 본문').default('시험용 글 본문입니다. 열 글자를 넘깁니다.'),
    shortTitle: z.string().min(1).describe('1자 제목').default('가'),
    shortContent: z.string().min(1).describe('9자 본문').default('가나다라마바사아자'),
  }),
  expected: z.object({
    titleLength: z.number().describe('제목에 남는 글자 수').default(50),
    contentLength: z.number().describe('본문에 남는 글자 수').default(2000),
    notCreated: z.string().describe('등록 뒤 머문 경로와 만들어진 글 수').default('/board/write, 0'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);
  const 아이디 = await 가입한다(request);
  const 만들어진글수 = async (제목: string): Promise<number> => {
    const 목록 = (await (await page.request.get(`/api/posts?field=author&q=${encodeURIComponent('시험회원')}&size=100`)).json()) as { items: { title: string }[] };
    return 목록.items.filter((글) => 글.title === 제목).length;
  };

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글쓰기 화면을 연다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면을 확인한다', async () => {
      await verify('일반 회원이 로그인해 있다', [await 머리.로그아웃.isVisible(), await 쓰기.제목칸.isVisible()].join(', '), 'true, true', { blocker: true });
    });

    await test.step('제목 칸에 51자를 적는다', async () => {
      await 쓰기.제목칸.fill('가'.repeat(51));
      await verify('제목에 51자를 적으면 50자까지만 남는다', (await 쓰기.제목칸.inputValue()).length, expected.titleLength);
    });

    await test.step('본문 칸에 2001자를 적는다', async () => {
      await 쓰기.본문칸.fill('나'.repeat(2001));
      await verify('본문에 2001자를 적으면 2000자까지만 남는다', (await 쓰기.본문칸.inputValue()).length, expected.contentLength);
    });

    await test.step('분류를 고르고 제목 1자와 정상 본문을 적어 「등록」을 누른다', async () => {
      await 쓰기.채운다(params.category, params.shortTitle, params.goodContent);
      const 응답 = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/posts'));
      await 쓰기.등록.click();
      await 응답;
      await verify(
        '제목을 1자만 적고 등록하면 글이 등록되지 않는다',
        [new URL(page.url()).pathname, await 만들어진글수(params.shortTitle)].join(', '),
        expected.notCreated,
      );
    });

    await test.step('분류를 고르고 정상 제목과 본문 9자를 적어 「등록」을 누른다', async () => {
      await 쓰기.채운다(params.category, params.goodTitle, params.shortContent);
      const 응답 = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/posts'));
      await 쓰기.등록.click();
      await 응답;
      await verify(
        '본문을 9자만 적고 등록하면 글이 등록되지 않는다',
        [new URL(page.url()).pathname, await 만들어진글수(params.goodTitle)].join(', '),
        expected.notCreated,
      );
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
