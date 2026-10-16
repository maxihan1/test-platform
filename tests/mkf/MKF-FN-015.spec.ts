import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 세션아이디, 처음방문인가, 서서히바뀌었나 } from './helpers/common-tools.helper.js';
import { 나타날때불투명도기록, 불투명도기록읽기 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-015',
  name: '공지 팝업은 0.3초 동안 서서히 나타난다',
  precondition: ['공지 팝업을 닫은 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 공지 = new 모달(page);

  await test.step('공지 팝업을 닫은 적 없는 비회원인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열어 공지 팝업이 나타나게 한다', async () => {
    await 방해막기(page, { 공지팝업: false });
    await 나타날때불투명도기록(page, '.modal-backdrop');
    await 홈.열기();
    await 홈.공지창.waitFor();
    await page.waitForFunction(() => {
      const 배경 = document.querySelector('.modal-backdrop');
      return 배경 !== null && getComputedStyle(배경).opacity === '1';
    });
    const 전환시간 = await 공지.배경.evaluate((el) => getComputedStyle(el).transitionDuration);
    await verify(
      '공지 팝업은 0.3초 동안 서서히 나타난다',
      { 전환시간, 서서히: 서서히바뀌었나(await 불투명도기록읽기(page)) },
      { 전환시간: '0.3s', 서서히: true },
    );
  });
});
