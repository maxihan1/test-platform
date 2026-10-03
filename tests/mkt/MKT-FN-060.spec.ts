import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상담 } from './components/chat.component.js';
import { 고객센터 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-060',
  name: '상담 버튼을 누르면 상담 창이 열리고 메시지를 보내면 자동 답변이 온다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '상담 창이 열려 있다'],
  params: z.object({
    message: z.string().min(1).describe('보내는 메시지').default('배송이 늦어요'),
  }),
  expected: z.object({
    reply: z.string().describe('자동 답변').default('상담원 연결 중입니다. 잠시만 기다려 주세요.'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 센터 = new 고객센터(page);
  const 챗 = new 상담(page);

  await test.step('고객센터 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await page.clock.install();
    await 센터.열기();
    await 챗.버튼.waitFor();
  });

  await test.step('상담 버튼을 누른다', async () => {
    await 챗.버튼.click();
    await 챗.입력.waitFor();
    await verify('상담 버튼을 누르면 상담 창이 열린다', await 챗.창.isVisible(), true);
  });

  await test.step('상담 창에서 메시지를 보낸다', async () => {
    await 챗.입력.fill(params.message);
    await 챗.보내기.click();
    await page.clock.runFor(1000);
    await verify(
      '메시지를 보내면 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 자동 답변으로 온다',
      await 센터.상담자동답변.innerText(),
      expected.reply,
    );
  });
});
