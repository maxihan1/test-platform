import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';

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
  tcId: 'MKT-FN-069',
  name: '「좋아요」를 누르면 좋아요 수가 1 오르고 다시 누르면 취소된다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다', '글 상세 화면이다', '이미 좋아요를 누른 글이다'],
  params: z.object({
    postId: z.number().describe('좋아요를 누를 남의 글 번호').default(49),
  }),
  expected: z.object({
    pressed: z.string().describe('누른 뒤 늘어난 수와 채운 하트').default('1, true'),
    canceled: z.string().describe('다시 누른 뒤 원래 수와 해제 상태').default('true, true'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 아이디 = await 가입한다(request);
  const 수 = async (): Promise<number> => Number(await 상세.좋아요수.innerText());

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시킨다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 머리.로그아웃.waitFor();
      await verify('회원 계정으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('글 상세 화면을 연다', async () => {
      await 상세.열기(params.postId);
      await 상세.안눌린좋아요.waitFor();
    });

    const 처음 = await 수();

    await test.step('「좋아요」를 누른다', async () => {
      await 상세.좋아요.click();
      await 상세.눌린좋아요.waitFor();
      await verify(
        '「좋아요」를 누르면 좋아요 수가 1 오르고 버튼이 채워진 하트로 바뀐다',
        [(await 수()) - 처음, (await 상세.좋아요.innerText()).includes('♥')].join(', '),
        expected.pressed,
      );
    });

    await test.step('「좋아요」를 다시 누른다', async () => {
      await 상세.좋아요.click();
      await 상세.안눌린좋아요.waitFor();
      await verify('「좋아요」를 다시 누르면 좋아요가 취소된다', [(await 수()) === 처음, (await 상세.눌린좋아요.count()) === 0].join(', '), expected.canceled);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
