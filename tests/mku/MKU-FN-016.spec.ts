import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-016',
  name: '토스트가 뜨고 2초가 지나도 토스트가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);
  await 방해막기(page);
  await page.clock.install();

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 한 글자로 검색해 토스트를 띄운다', async () => {
    await 목록.검색어.fill('가');
    await page.clock.pauseAt(await page.evaluate(() => Date.now()));
    await 목록.검색.click();
    await 알림.알림들.first().waitFor();
    await page.clock.runFor(2000);
    await verify('토스트가 뜨고 2초가 지나도 토스트가 보인다', await 알림.알림들.first().isVisible(), true);
  });

  await test.step('토스트가 뜬 뒤 3초를 기다린다', async () => {
    await page.clock.runFor(3000);
    await verify('토스트가 뜨고 3초가 지나면 토스트가 보이지 않는다', await 알림.알림들.first().isVisible(), false);
  });
});
