import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-008',
  name: '홈 배너의 자동 넘김 · 마우스 멈춤 · 점 이동이 알맞게 동작한다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 시작 = new Date();
  await page.clock.install({ time: 시작 });
  await page.clock.pauseAt(new Date(시작.getTime() + 1000));

  await test.step('4초마다 배너가 넘어가기를 기다린다', async () => {
    await 홈.열기();
    await 홈.추천상품카드들().first().waitFor();
    await 홈.배너점들().first().waitFor();
    await 홈.공지팝업().waitFor();
    await 홈.공지팝업닫기버튼().click();
    await 홈.마우스치우기();
    await page.clock.runFor(15000);
    await 홈.설문다음에버튼().click();
    await page.clock.runFor(300);
    await verify('배너의 현재 장이 1번 배너다', await 홈.현재배너번호(), '1번 배너', { blocker: true });
    await page.clock.runFor(4000);
    const 첫째 = await 홈.현재배너번호();
    await page.clock.runFor(4000);
    await verify('배너가 4초마다 자동으로 다음 장으로 넘어간다', [첫째, await 홈.현재배너번호()], ['2번 배너', '3번 배너']);
  });

  await test.step('마지막 장까지 넘어가기를 기다린다', async () => {
    await verify('배너의 현재 장이 마지막 장인 3번 배너다', await 홈.현재배너번호(), '3번 배너', { blocker: true });
    await page.clock.runFor(4000);
    await verify('마지막 장 다음에는 첫 장으로 돌아간다', await 홈.현재배너번호(), '1번 배너');
  });

  await test.step('배너에 마우스를 올린다', async () => {
    await 홈.배너().hover();
    await page.clock.runFor(8000);
    await verify('배너에 마우스를 올리면 자동 넘김이 멈춘다', await 홈.현재배너번호(), '1번 배너');
  });

  await test.step('배너에서 마우스를 치운다', async () => {
    await 홈.마우스치우기();
    await page.clock.runFor(4000);
    await verify('마우스를 치우면 자동 넘김이 다시 시작된다', await 홈.현재배너번호(), '2번 배너');
  });

  await test.step('배너 아래 점을 누른다', async () => {
    await 홈.배너점(3).click();
    await verify('점을 누르면 그 장으로 바로 간다', await 홈.현재배너번호(), '3번 배너');
  });
});
