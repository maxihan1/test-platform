import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상담 } from './components/chat.component.js';
import { 고객센터 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-018',
  name: '고객센터에 지도 틀이 보이고 모든 화면에 상담 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터(page);
  const 챗 = new 상담(page);

  const 오른쪽아래인가 = async (): Promise<boolean> => {
    await 챗.버튼.waitFor();
    const 상자 = await 챗.버튼.boundingBox();
    const 화면 = page.viewportSize();
    if (!상자 || !화면) return false;
    return 상자.x + 상자.width / 2 > 화면.width / 2 && 상자.y + 상자.height / 2 > 화면.height / 2;
  };

  await test.step('고객센터 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 센터.열기();
    await verify(
      '고객센터 화면 아래쪽 「오시는 길」에 지도가 들어간 틀이 보인다',
      [await 센터.오시는길.isVisible(), await 센터.지도틀.isVisible()].join(', '),
      'true, true',
    );
  });

  await test.step('홈 화면과 고객센터 화면을 차례로 연다', async () => {
    await page.goto('/');
    const 홈 = await 오른쪽아래인가();
    await page.goto('/support');
    const 센터화면 = await 오른쪽아래인가();
    await verify('모든 화면 오른쪽 아래에 상담 버튼이 보인다', [홈, 센터화면].join(', '), 'true, true');
  });

  await test.step('홈 화면을 연다', async () => {
    await page.goto('/');
    await 챗.버튼.waitFor();
    await verify(
      '상담 창은 페이지의 다른 스타일과 섞이지 않게 Shadow DOM 으로 분리돼 있다',
      await 챗.요소.evaluate((el) => el.shadowRoot !== null),
      true,
    );
  });
});
