import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-559',
  name: '문의 내용 칸에 1001자를 적으면 1000자까지만 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    글자수: z.number().int().describe('내용 칸에 적을 글자 수 — 1001 이상').default(1001),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
    });

    await test.step('1:1 문의 화면이 열렸는지 확인한다', async () => {
      await verify('유형 칸이 보인다', await 문의.유형칸.isVisible(), true, { blocker: true });
    });

    await test.step('문의 내용 칸에 1001자를 적는다', async () => {
      await 문의.내용쓰기('내'.repeat(params.글자수));
      await verify('문의 내용 칸에 1001자를 적으면 1000자까지만 들어간다', (await 문의.내용칸.inputValue()).length, 1000);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
