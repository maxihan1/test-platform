import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-327',
  name: '회원 목록 영역 높이는 600px 이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: z.object({
    영역높이: z.number().describe('회원 목록 영역 높이(px)').default(600),
    기준명수: z.number().describe('이어서 볼 수 있어야 하는 회원 수 기준').default(1000),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 관리자화면(page);
  let 마지막아이디 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  await test.step('관리자 화면을 연다', async () => {
    const 응답 = page.waitForResponse((r) => r.url().includes('/api/admin/users') && r.request().method() === 'GET');
    await page.goto(관리자화면.주소);
    const 몸 = (await (await 응답).json()) as { items: { loginId: string }[] };
    마지막아이디 = 몸.items[몸.items.length - 1].loginId;
    await 화면.그려질때까지();
    await verify('회원 관리 표가 보인다', await 화면.회원표.isVisible(), true, { blocker: true });
  });

  await test.step('회원 목록 영역 높이를 확인한다', async () => {
    const 칸 = await 화면.회원목록영역.boundingBox();
    await verify('회원 목록 영역 높이는 600px 이다', 칸?.height, expected.영역높이);
  });

  await test.step('회원 목록 영역을 끝까지 내린다', async () => {
    await 화면.회원목록영역.evaluate((칸) => {
      칸.scrollTop = 칸.scrollHeight;
    });
    await 화면.회원줄(마지막아이디).waitFor();
    const 마지막 = await verify('목록 맨 끝 회원 줄이 보인다', await 화면.회원줄(마지막아이디).isVisible(), true);
    const 많음 = await verify('총 인원이 1,000명을 넘는다', (await 화면.총인원숫자()) > expected.기준명수, true);
    await verify('회원 목록 영역을 내리면 1,000명이 넘는 회원 줄을 이어서 볼 수 있다', 마지막 && 많음, true);
  });
});
