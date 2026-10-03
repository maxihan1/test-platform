import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-071',
  name: '「링크 복사」를 누르면 글 주소가 클립보드에 복사되고 안내 토스트가 보인다',
  platforms: ['desktop'],
  precondition: ['클립보드 권한이 있는 회원이 글 상세 화면에 있다', '클립보드는 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
    postId: z.number().describe('글 번호').default(48),
  }),
  expected: z.object({
    toast: z.string().describe('복사 안내 문구').default('링크를 복사했습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 알림 = new 토스트(page);

  await test.step('클립보드 권한을 주고 회원 계정으로 로그인해 글 상세 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.context().addInitScript(() => {
      const 보관: { 글자: string } = { 글자: '' };
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (글자: string) => {
            보관.글자 = 글자;
          },
          readText: async () => 보관.글자,
        },
      });
    });
    await 로그인.로그인한다(params.loginId, params.password ?? '');
    await 상세.열기(params.postId);
  });

  await test.step('글 상세 화면을 확인한다', async () => {
    await 상세.링크복사.waitFor();
    await verify(
      '클립보드 권한이 있는 회원이 글 상세 화면에 있다',
      [await 머리.로그아웃.isVisible(), await 상세.링크복사.isVisible()].join(', '),
      'true, true',
      { blocker: true },
    );
  });

  await test.step('「링크 복사」를 누른다', async () => {
    await 상세.링크복사.click();
    await 알림.문구(expected.toast).waitFor();
    const 복사됨 = await page.evaluate(() => navigator.clipboard.readText());
    await verify('「링크 복사」를 누르면 글 주소가 클립보드에 복사된다', 복사됨, `${new URL(page.url()).origin}/board/${params.postId}`);
    await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다', await 알림.문구(expected.toast).innerText(), expected.toast);
  });
});
