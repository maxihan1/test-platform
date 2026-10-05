import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { MB, 일반파일 } from './components/files.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 일대일문의화면 } from './pages/common-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-541',
  name: '10MB 를 넘는 파일을 고르면 토스트 「10MB 이하 파일만 올릴 수 있습니다」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  unconfirmed: '기획서와 다름 — 차이 D26: 첨부 10MB 초과 토스트가 기획서에 없다 (작성 요청 5873)',
  techniques: ['경계값 분석'],
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

    await test.step('첨부 파일에 10MB 를 넘는 파일을 고른다', async () => {
      await 문의.파일고르기(일반파일('열메가넘음.txt', 10 * MB + 1));
      await 문의.토스트.전부.first().waitFor();
      await verify('10MB 를 넘는 파일을 고르면 토스트 「10MB 이하 파일만 올릴 수 있습니다」가 보인다', await 문의.토스트.문구('10MB 이하 파일만 올릴 수 있습니다').count(), 1);
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
