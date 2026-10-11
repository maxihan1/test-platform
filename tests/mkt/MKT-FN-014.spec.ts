import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-014',
  name: '홈 화면에서 4초가 지나면 배너가 다음 장으로 넘어간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면에서 4초를 기다린다', async () => {
    await 방해막기(page);
    await page.clock.install();
    await 홈.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await verify('홈 배너가 첫 장이다', await 홈.현재점번호(), 1, { blocker: true });
    await page.clock.runFor(4000);
    await verify('홈 화면에서 4초가 지나면 배너가 다음 장으로 넘어간다', await 홈.현재점번호(), 2);
  });

  await test.step('마지막 배너에서 4초를 기다린다', async () => {
    await 홈.점(3).click();
    await page.mouse.move(5, 5);
    await verify('홈 배너가 마지막 장이다', await 홈.현재점번호(), 3, { blocker: true });
    await page.clock.runFor(4000);
    await verify('마지막 배너에서 4초가 지나면 첫 장으로 돌아간다', await 홈.현재점번호(), 1);
  });

  await test.step('배너에 마우스를 올리고 4초를 기다린다', async () => {
    await 홈.배너.hover();
    await page.clock.runFor(4000);
    await verify('배너에 마우스를 올리고 있으면 4초가 지나도 배너가 넘어가지 않는다', await 홈.현재점번호(), 1);
  });

  await test.step('배너에서 마우스를 치우고 4초를 기다린다', async () => {
    await page.mouse.move(5, 5);
    await page.clock.runFor(4000);
    await verify('배너에서 마우스를 치우고 4초가 지나면 배너가 다시 넘어간다', await 홈.현재점번호(), 2);
  });

  await test.step('배너 아래 세 번째 점을 누른다', async () => {
    await 홈.점(3).click();
    await verify('배너 아래 세 번째 점을 누르면 세 번째 배너로 바로 간다', await 홈.현재점번호(), 3);
  });
});
