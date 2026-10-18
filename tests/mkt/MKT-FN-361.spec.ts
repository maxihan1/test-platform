import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 상담창 } from './components/chat.component.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-361',
  name: '메시지를 보내고 1초가 되기 전에는 자동 답변이 없다',
  platforms: ['desktop', 'mobile'],
  precondition: ['상담 창이 열려 있다'],
  params: z.object({
    메시지: z.string().min(1).describe('상담 메시지 — 빈 글이 아니면 같은 결과').default('안녕하세요'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 고객센터 = new 고객센터화면(page);
  const 상담 = new 상담창(page);
  const 자동답변 = 상담.기록.getByText('상담원 연결 중입니다. 잠시만 기다려 주세요.');

  await test.step('상담 창을 연다', async () => {
    await 방해창막기(page);
    await page.clock.install();
    await 고객센터.열기();
    await 상담.열기();
    await page.clock.pauseAt(new Date(Date.now() + 5000));
  });

  await test.step('상담 창이 열렸는지 확인한다', async () => {
    await verify('상담 창이 보인다', await 상담.창.isVisible(), true, { blocker: true });
  });

  await test.step('상담 메시지 「안녕하세요」를 보내고 1초가 되기 전을 확인한다', async () => {
    await 상담.보내기누르기(params.메시지);
    await 상담.기록.getByText(params.메시지, { exact: true }).waitFor();
    await page.clock.runFor(900);
    await verify('메시지를 보내고 1초가 되기 전에는 자동 답변이 없다', await 자동답변.count(), 0);
  });

  await test.step('메시지를 보낸 뒤 1초를 보낸다', async () => {
    await page.clock.runFor(1000);
    await verify('메시지를 보내고 1초 뒤 「상담원 연결 중입니다. 잠시만 기다려 주세요.」가 자동 답변으로 온다', await 자동답변.count(), 1);
  });
});
