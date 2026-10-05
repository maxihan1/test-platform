import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 일대일문의화면 } from './pages/common-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-379',
  name: '문의를 등록하면 「내 문의 내역」 맨 위에 그 문의가 「답변 대기」 상태로 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
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

    await test.step('1:1 문의에 유형 · 제목 · 내용을 적고 「등록」을 누른다', async () => {
      await 문의.유형칸.selectOption('주문');
      await 문의.제목적기('주문 관련 문의드립니다');
      await 문의.내용적기('주문한 상품이 언제 오는지 궁금합니다');
      await 문의.등록버튼.click();
      await 문의.내역행들.nth(1).waitFor();
      const 첫줄 = await 문의.내역첫줄();
      await verify('문의를 등록하면 「내 문의 내역」 맨 위에 그 문의가 「답변 대기」 상태로 보인다', [첫줄[1], 첫줄[3]], ['주문 관련 문의드립니다', '답변 대기']);
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
