import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상담창 } from './components/chat.component.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-274',
  name: '상담 창은 Shadow DOM 으로 분리된 영역 안에 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  const 상담 = new 상담창(page);

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 고객센터.열기();
  });

  await test.step('고객센터 화면이 열렸는지 확인한다', async () => {
    await verify('상담 버튼이 보인다', await 상담.상담버튼.isVisible(), true, { blocker: true });
  });

  await test.step('상담 창을 연다', async () => {
    await 상담.열기();
  });

  await test.step('상담 창이 열렸는지 확인한다', async () => {
    await verify('상담 창이 보인다', await 상담.창.isVisible(), true, { blocker: true });
  });

  await test.step('상담 창이 든 요소를 확인한다', async () => {
    const 분리됨 = await 상담.요소.evaluate((요소) => 요소.shadowRoot !== null && 요소.querySelector('[aria-label="상담 창"]') === null);
    await verify('상담 창은 Shadow DOM 으로 분리된 영역 안에 있다', { 분리됨, 창개수: await 상담.창.count() }, { 분리됨: true, 창개수: 1 });
  });
});
