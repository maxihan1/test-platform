import { defineCase, test, verify } from '@platform/kit';

import { 상자, 세션아이디, 응답붙잡기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-064',
  name: '이벤트 띠가 들어오면 「인기글」 탭이 띠 높이만큼 아래로 밀려나 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  let 붙잡음: { 풀기: () => Promise<void> } | undefined;

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('홈을 열고 이벤트 띠를 기다린다', async () => {
      붙잡음 = await 응답붙잡기(page, '**/api/event-strip');
      await 방해막기(page);
      await 홈.열기();
      await 홈.글링크들.first().waitFor();
      const 띠가오기전 = (await 상자(홈.인기글탭)).y;
      await 붙잡음.풀기();
      await 홈.이벤트띠.waitFor();
      const 띠가온뒤 = (await 상자(홈.인기글탭)).y;
      await verify(
        '이벤트 띠가 들어오면 「인기글」 탭이 띠 높이만큼 아래로 밀려나 보인다',
        띠가온뒤 - 띠가오기전 >= (await 상자(홈.이벤트띠)).height,
        true,
      );
    });
  } finally {
    await 붙잡음?.풀기();
  }
});
