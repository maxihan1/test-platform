import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { MB, 일반파일 } from './components/files.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 일대일문의화면 } from './pages/common-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-377',
  name: '문의 제목 칸에 50자를 적으면 50자가 다 들어간다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
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

    await test.step('1:1 문의 제목 칸에 50자를 적는다', async () => {
      await 문의.제목적기('가'.repeat(50));
      await verify('문의 제목 칸에 50자를 적으면 50자가 다 들어간다', await 문의.칸글자수(문의.제목칸), 50);
    });

    await test.step('문의 제목 칸에 51자를 적는다', async () => {
      await 문의.제목적기('가'.repeat(51));
      await verify('문의 제목 칸에 51자를 적으면 50자까지만 들어간다', await 문의.칸글자수(문의.제목칸), 50);
    });

    await test.step('문의 내용 칸에 1000자를 적는다', async () => {
      await 문의.내용적기('나'.repeat(1000));
      await verify('문의 내용 칸에 1000자를 적으면 1000자가 다 들어간다', await 문의.칸글자수(문의.내용칸), 1000);
    });

    await test.step('문의 내용 칸에 1001자를 적는다', async () => {
      await 문의.내용적기('나'.repeat(1001));
      await verify('문의 내용 칸에 1001자를 적으면 1000자까지만 들어간다', await 문의.칸글자수(문의.내용칸), 1000);
    });

    await test.step('첨부 파일에 10MB 파일을 고른다', async () => {
      await 문의.파일고르기(일반파일('열메가.txt', 10 * MB));
      await verify('10MB 파일은 첨부 칸에 남는다', await 문의.첨부파일수(), 1);
    });

    await test.step('첨부 파일에 10MB 를 넘는 파일을 고른다', async () => {
      await 문의.파일고르기(일반파일('열메가넘음.txt', 10 * MB + 1));
      await verify('10MB 를 넘는 파일은 첨부 칸에서 비워진다', await 문의.첨부파일수(), 0);
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
