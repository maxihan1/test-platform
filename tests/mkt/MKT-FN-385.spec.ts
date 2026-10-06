import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-385',
  name: '상담 버튼을 누르면 상담 창이 열린다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    문의글: z.string().describe('상담 메시지').default('배송 문의'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 화면에서 상담 버튼을 누른다', async () => {
    await 쇼핑.상담.열버튼누르기();
    await verify('상담 버튼을 누르면 상담 창이 열린다', await 쇼핑.상담.창.isVisible(), true);
  });

  await test.step('상담 창에 「배송 문의」를 적고 「보내기」를 누른다', async () => {
    await 쇼핑.상담.메시지보내기(params.문의글);
    await page.waitForTimeout(1500);
    await verify(
      '메시지를 보내면 1초 뒤 자동 답변 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 보인다',
      await 쇼핑.상담.자동답변.isVisible(),
      true,
    );
  });
});
