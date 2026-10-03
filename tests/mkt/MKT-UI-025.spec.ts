import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 글쓰기 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-025',
  name: '글쓰기 화면에 분류 · 제목 · 본문 입력칸이 보이고 일반 회원의 분류는 셋뿐이다',
  platforms: ['desktop'],
  precondition: ['일반 회원이 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    categories: z.string().describe('일반 회원의 분류 항목').default('자유, 질문, 후기'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 로그인.로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await 머리.로그아웃.waitFor();
    await verify('일반 회원이 로그인해 있다', [await 머리.로그아웃.isVisible(), await 머리.관리자링크.count()].join(', '), 'true, 0', { blocker: true });
  });

  await test.step('글쓰기 화면을 연다', async () => {
    await 쓰기.열기();
    await 쓰기.분류항목.nth(2).waitFor({ state: 'attached' });
    await verify(
      '글쓰기 화면에 분류 드롭다운 · 제목 · 본문 입력칸이 보인다',
      [await 쓰기.분류.isVisible(), await 쓰기.제목칸.isVisible(), await 쓰기.본문칸.isVisible()].join(', '),
      'true, true, true',
    );
    await verify('일반 회원의 분류 드롭다운에는 「자유」 · 「질문」 · 「후기」만 보인다', (await 쓰기.분류항목.allInnerTexts()).join(', '), expected.categories);
  });
});
