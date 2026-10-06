import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 일대일문의화면 } from './pages/common-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-179',
  name: '1:1 문의 내용 칸 아래에 글자 수 「0/1000」이 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  unconfirmed: '기획서와 다름 — 차이 D25: 문의 내용 글자 수 표시가 기획서에 없다 (작성 요청 5873)',
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
      await verify('1:1 문의 내용 칸 아래에 글자 수 「0/1000」이 보인다', [(await 문의.글자수.innerText()).trim(), await 문의.내용칸아래에글자수가있나()], ['0/1000', true]);
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
