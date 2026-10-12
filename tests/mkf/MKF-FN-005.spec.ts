import { defineCase, test, verify } from '@platform/kit';

import { 토스트올라옴표본 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-005',
  name: '토스트는 화면 아래에서 위로 밀려 올라오며 나타난다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 「a」로 검색해 토스트를 띄운다', async () => {
    await 목록.검색어.fill('a');
    const 위치들 = 토스트올라옴표본(page);
    await 목록.검색.click();
    const 표본 = await 위치들;
    const 처음 = 표본.at(0) ?? 0;
    const 끝 = 표본.at(-1) ?? 0;
    await verify('토스트는 화면 아래에서 위로 밀려 올라오며 나타난다', 표본.length > 1 && 처음 - 끝 >= 10, true);
  });
});
