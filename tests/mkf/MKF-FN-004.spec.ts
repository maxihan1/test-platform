import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 화면아래가운데에있나 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-004',
  name: '검색어 「a」로 검색하면 토스트가 화면 아래 가운데에 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await page.clock.install();
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 「a」로 검색한다', async () => {
    await 목록.검색어.fill('a');
    await 목록.검색.click();
    await 알림.알림들.first().waitFor();
    await verify('검색어 「a」로 검색하면 토스트가 화면 아래 가운데에 보인다', await 화면아래가운데에있나(page, 알림.알림들.first()), true);
  });

  await test.step('토스트가 뜬 뒤 3초를 기다린다', async () => {
    await page.clock.runFor(3000);
    await 알림.알림들.first().waitFor({ state: 'detached', timeout: 1500 });
    await verify('토스트는 3초가 지나면 사라진다', await 알림.알림들.first().isVisible(), false);
  });
});
