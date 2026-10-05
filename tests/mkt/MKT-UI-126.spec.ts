import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 일대일문의화면 } from './pages/common-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-126',
  name: '1:1 문의에 유형 · 제목 · 내용 · 첨부 파일 칸과 「답변 알림 이메일 받기」 체크박스가 보인다',
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
      await verify(
        '1:1 문의에 유형 · 제목 · 내용 · 첨부 파일 칸과 「답변 알림 이메일 받기」 체크박스가 보인다',
        [
          await 문의.유형칸.isVisible(),
          await 문의.제목칸.isVisible(),
          await 문의.내용칸.isVisible(),
          await 문의.첨부칸.isVisible(),
          await 문의.이메일체크박스.isVisible(),
        ],
        [true, true, true, true, true],
      );
      await verify('문의 유형 선택 상자에 「주문」 · 「배송」 · 「상품」 · 「기타」가 있다', (await 문의.유형옵션들()).filter((옵션) => ['주문', '배송', '상품', '기타'].includes(옵션)).join(' · '), '주문 · 배송 · 상품 · 기타');
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
