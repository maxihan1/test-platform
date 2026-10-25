import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'DMW-UI-227',
  name: '화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
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

  await test.step('홈 화면 오른쪽 아래를 확인한다', async () => {
    const 칸 = await 상담.상담버튼.boundingBox();
    const 화면 = page.viewportSize();
    const 보임 = await verify('상담 버튼이 보인다', await 상담.상담버튼.isVisible(), true);
    const 오른쪽 = await verify('상담 버튼이 화면 오른쪽에 있다', 칸 !== null && 화면 !== null && 칸.x + 칸.width / 2 > 화면.width / 2, true);
    const 아래 = await verify('상담 버튼이 화면 아래쪽에 있다', 칸 !== null && 화면 !== null && 칸.y + 칸.height / 2 > 화면.height / 2, true);
    const 말풍선 = await verify('상담 버튼에 말풍선 모양이 들어 있다', (await 상담.상담버튼.innerText()).trim(), '💬');
    await verify('화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다', 보임 && 오른쪽 && 아래 && 말풍선, true);
  });

  await test.step('상담 버튼을 누른다', async () => {
    await 상담.상담버튼.click();
    await verify('상담 버튼을 누르면 상담 창이 열린다', await 상담.창.isVisible(), true);
  });
});
