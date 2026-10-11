import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 토스트시작높이, 토스트자리읽기 } from './helpers/board.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-006',
  name: '토스트가 뜨면 화면 아래 가운데에 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  let 뜬때 = 0;

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 한 글자로 검색한다', async () => {
    await 목록.검색어넣고누르기('가');
    await 알림.모두.first().waitFor();
    뜬때 = Date.now();
    await verify('토스트가 뜨면 화면 아래 가운데에 보인다', await 토스트자리읽기(page, 알림.모두.first()), { 가운데: true, 아래: true });
    await verify('토스트는 아래에서 밀려 올라온다', (await 토스트시작높이(알림.모두.first())) > 0, true);
  });

  await test.step('토스트가 뜬 뒤 3초를 기다린다', async () => {
    await 알림.모두.first().waitFor({ state: 'detached', timeout: 5000 });
    const 걸린시간 = Date.now() - 뜬때;
    await verify('토스트는 3초 뒤에 사라진다', 걸린시간 >= 2300 && 걸린시간 <= 3700, true);
  });
});
