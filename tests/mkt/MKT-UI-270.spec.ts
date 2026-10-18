import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-270',
  name: '지도 틀의 「축소」를 누르면 배율 숫자가 1 줄어든다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 고객센터.열기();
  });

  await test.step('지도 틀이 열렸는지 확인한다', async () => {
    await 고객센터.배율.waitFor();
    await verify('지도 틀에 「확대」 버튼이 보인다', await 고객센터.확대버튼.isVisible(), true, { blocker: true });
  });

  await test.step('지도 틀 안의 「축소」를 누른다', async () => {
    const 앞 = await 고객센터.배율숫자();
    await 고객센터.축소버튼.click();
    await verify('지도 틀의 「축소」를 누르면 배율 숫자가 1 줄어든다', 앞 - (await 고객센터.배율숫자()), 1);
  });

  await test.step('지도 틀 안의 「확대」를 누른다', async () => {
    const 앞 = await 고객센터.배율숫자();
    await 고객센터.확대버튼.click();
    await verify('지도 틀의 「확대」를 누르면 배율 숫자가 1 늘어난다', (await 고객센터.배율숫자()) - 앞, 1);
  });
});
