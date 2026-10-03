import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 게시판검색화면 } from './pages/common-board.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-007',
  name: '게시판에서 검색어를 1자만 적고 검색하면 토스트가 아래 가운데에 보이고 3초쯤 뒤 사라진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 게시판 = new 게시판검색화면(page);
  const 홈 = new 홈화면(page);
  const 알림 = new 토스트(page);
  const 시작 = new Date();
  await page.clock.install({ time: 시작 });
  await page.clock.pauseAt(new Date(시작.getTime() + 1000));

  await test.step('게시판 화면에서 검색어를 1자만 적고 검색한다', async () => {
    await 게시판.열기();
    await 게시판.제목().waitFor();
    await 게시판.검색하기('가');
    const 위치 = await 홈.화면중심기준위치(알림.영역());
    await verify(
      '처리 결과 토스트가 화면 아래 가운데에 보인다',
      [await 알림.영역().isVisible(), Math.abs(위치.가로) <= 2, 위치.세로 > 0],
      [true, true, true],
      { blocker: true },
    );
    await page.clock.runFor(3000);
    await verify('토스트는 3초쯤 지나면 사라진다', await 알림.영역().isVisible(), false);
  });
});
