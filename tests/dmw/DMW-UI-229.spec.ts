import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'DMW-UI-229',
  name: '상담 창은 페이지와 분리된 Shadow DOM 영역 안에 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상담 = new 상담창(page);

  await test.step('비회원으로 홈 화면을 연다', async () => {
    await 안내창막기(page);
    await page.goto('/');
    await 상담.상담버튼.waitFor();
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('상담 버튼이 든 영역을 확인한다', async () => {
    const 영역 = await verify('상담 영역에 분리된 Shadow DOM 이 붙어 있다', await 상담.요소.evaluate((칸) => 칸.shadowRoot !== null), true);
    const 버튼 = await verify('상담 버튼이 그 Shadow DOM 안에 있다', await 상담.요소.evaluate((칸) => 칸.shadowRoot?.querySelector('button[aria-label="상담하기"]') !== null), true);
    await verify('상담 창은 페이지와 분리된 Shadow DOM 영역 안에 있다', 영역 && 버튼, true);
  });
});
