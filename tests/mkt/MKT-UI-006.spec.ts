import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-006',
  name: '처음 방문한 홈 화면에 쿠키 안내 띠와 공지 팝업이 보인다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 띠 = new 쿠키띠(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.설문을치운다();
    await 홈.열기();
    await 띠.영역.waitFor();
    await 홈.공지팝업.waitFor();
    await 홈.공지팝업이자리잡을때까지기다린다();
    const 화면 = page.viewportSize();
    const 띠상자 = await 띠.영역.boundingBox();
    const 팝업상자 = await 홈.공지팝업.boundingBox();
    await verify(
      '처음 방문하면 화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」가 보인다',
      (await 띠.영역.getByText('서비스 개선을 위해 쿠키를 사용합니다.').isVisible()) &&
        Math.round((띠상자?.y ?? 0) + (띠상자?.height ?? 0)) === (화면?.height ?? 0),
      true,
    );
    await verify('쿠키 안내 띠에 「동의」 버튼이 보인다', await 띠.동의.isVisible(), true);
    await verify('동의하기 전까지 쿠키 안내 띠는 화면 아래 내용을 덮는다', await 띠.영역.evaluate((요소) => getComputedStyle(요소).position), 'fixed');
    await verify(
      '공지 팝업이 나타날 때 0.3초 동안 서서히 나타나는 전환이 걸려 있다',
      await 홈.공지바탕.evaluate((요소) => getComputedStyle(요소).transitionDuration),
      '0.3s',
    );
    await verify(
      '홈에 처음 들어오면 공지 팝업이 가운데에 보인다',
      (await 홈.공지팝업.isVisible()) &&
        Math.abs((팝업상자?.x ?? 0) + (팝업상자?.width ?? 0) / 2 - (화면?.width ?? 0) / 2) < 2 &&
        Math.abs((팝업상자?.y ?? 0) + (팝업상자?.height ?? 0) / 2 - (화면?.height ?? 0) / 2) < 2,
      true,
    );
    await verify('공지 팝업에 「닫기」 버튼이 보인다', await 홈.공지닫기.isVisible(), true);
    await verify('공지 팝업에 「오늘 하루 보지 않기」 체크박스가 보인다', await 홈.공지체크.isVisible(), true);
  });
});
