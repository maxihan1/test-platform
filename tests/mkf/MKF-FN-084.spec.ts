import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-084',
  name: '검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
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
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 검색어 「a」 1자로 검색한다', async () => {
    await 목록.검색어.fill('a');
    await 목록.검색.click();
    await 알림.글('검색어를 2자 이상 입력하세요').first().waitFor();
    await verify('검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다', await 알림.글('검색어를 2자 이상 입력하세요').first().isVisible(), true);
  });

  await test.step('게시판 검색어 「데모」 2자로 검색한다', async () => {
    await 알림.알림들.first().waitFor({ state: 'detached' });
    await 목록.검색어.fill('데모');
    await 목록.검색.click();
    await 목록.그려질때까지();
    const 검색어토스트 = await 알림.글('검색어를 2자 이상 입력하세요').count();
    await verify('검색어 2자로 검색하면 검색어 안내 토스트 없이 검색 결과가 보인다', 검색어토스트 === 0 && (await 목록.일반행.count()) > 0, true);
  });
});
