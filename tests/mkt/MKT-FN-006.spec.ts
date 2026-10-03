import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 게시판목록 } from './pages/board-list.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-006',
  name: '검색어 한 글자로 검색하면 토스트가 올라왔다 사라지고 공지 팝업은 서서히 닫힌다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '홈 화면에 공지 팝업이 떠 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 목록 = new 게시판목록(page);
  const 알림 = new 토스트(page);

  await test.step('게시판 목록에서 검색어를 한 글자만 적고 「검색」을 누른다', async () => {
    await page.clock.install();
    await 홈.쿠키띠를치운다();
    await 목록.열기();
    await 목록.검색한다('가');
    await 알림.전체.first().waitFor();
    const 상자 = await 알림.상자.boundingBox();
    const 화면 = page.viewportSize();
    const 가운데 = (상자?.x ?? 0) + (상자?.width ?? 0) / 2;
    await verify(
      '검색어 한 글자로 검색하면 토스트가 화면 아래 가운데에 보인다',
      Math.abs(가운데 - (화면?.width ?? 0) / 2) < 2 && (상자?.y ?? 0) > (화면?.height ?? 0) / 2,
      true,
    );
    const 시작이아래다 = await 알림.전체.first().evaluate((요소) => {
      const 키프레임 = (요소.getAnimations()[0]?.effect as KeyframeEffect | undefined)?.getKeyframes()[0];
      const 값 = /translateY\((-?[\d.]+)px\)/.exec(String(키프레임?.transform ?? ''));
      return 값 !== null && Number(값[1]) > 0;
    });
    await verify('토스트는 아래에서 밀려 올라온다', 시작이아래다, true);
    await page.clock.runFor(3100);
    await verify('토스트는 3초 뒤 보이지 않는다', await 알림.전체.count(), 0);
  });

  await test.step('홈 화면에 공지 팝업을 띄운다', async () => {
    await 홈.열기();
  });

  await test.step('홈 화면에 공지 팝업이 떠 있는지 확인한다', async () => {
    await 홈.공지팝업.waitFor();
    await verify('홈 화면에 공지 팝업이 떠 있다', await 홈.공지팝업.isVisible(), true, { blocker: true });
  });

  await test.step('공지 팝업에서 「닫기」를 누른다', async () => {
    const 길이 = await 홈.공지바탕.evaluate((요소) => getComputedStyle(요소).transitionDuration);
    await 홈.공지닫기.click();
    await 홈.공지팝업.waitFor({ state: 'detached' });
    await verify('모달과 팝업은 닫을 때 0.3초 동안 서서히 사라진다', 길이, '0.3s');
  });
});
