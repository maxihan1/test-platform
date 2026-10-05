import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 일대일문의화면 } from './pages/common-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-378',
  name: '문의 유형을 고르지 않으면 문의가 등록되지 않아 「내 문의 내역」이 늘지 않는다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 문의 = new 일대일문의화면(page);
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('새로 만든 회원을 가입시키고 로그인한다', async () => {
      회원 = await 임시회원로그인(page.request);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await page.request.get('/api/auth/me')).status(), 200, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 안내창끄기(page);
      await 문의.열기();
    });

    await test.step('유형을 고르지 않고 제목과 내용을 적어 「등록」을 누른다', async () => {
      const 이전건수 = await 문의.내역건수();
      await 문의.제목적기('유형을 안 고른 문의');
      await 문의.내용적기('유형을 고르지 않고 등록해 봅니다');
      await 문의.등록버튼.click();
      await 문의.토스트.전부.first().waitFor();
      await verify('문의 유형을 고르지 않으면 문의가 등록되지 않아 「내 문의 내역」이 늘지 않는다', await 문의.내역건수(), 이전건수);
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
