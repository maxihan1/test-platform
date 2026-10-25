import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상담창 } from './components/chat.component.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-315',
  name: '상담 창에서 메시지를 보내면 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 자동 답변으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    메시지: z.string().min(1).describe('상담 창에 보낼 메시지 — 한 글자 이상').default('배송은 언제 오나요'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상담 = new 상담창(page);

  await test.step('비회원으로 홈 화면을 열고 상담 창을 연다', async () => {
    await page.clock.install();
    await 안내창막기(page);
    await page.goto('/');
    await 상담.상담버튼.click();
    await verify('상담 창이 열려 있다', await 상담.창.isVisible(), true, { blocker: true });
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('상담 창에 메시지를 적어 보낸다', async () => {
    await 상담.입력.fill(params.메시지);
    await 상담.보내기.click();
    await page.clock.runFor(1000);
    await 상담.답변('상담원 연결 중입니다. 잠시만 기다려 주세요.').waitFor();
    await verify('상담 창에서 메시지를 보내면 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 자동 답변으로 보인다', await 상담.답변('상담원 연결 중입니다. 잠시만 기다려 주세요.').isVisible(), true);
  });
});
