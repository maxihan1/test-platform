import { defineCase, test, verify } from '@platform/kit';

import { 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-051',
  name: '홈 배너 아래에 「인기글」 · 「최신글」 탭이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.인기글탭.waitFor();
    await verify(
      '홈 배너 아래에 「인기글」 · 「최신글」 탭이 보인다',
      await 보이는이름들({ '「인기글」 탭': 홈.인기글탭, '「최신글」 탭': 홈.최신글탭 }),
      '「인기글」 탭, 「최신글」 탭',
    );
    await verify(
      '홈 글 탭은 처음에 「인기글」이 선택되어 보인다',
      { 인기글: await 홈.인기글탭.getAttribute('aria-selected'), 최신글: await 홈.최신글탭.getAttribute('aria-selected') },
      { 인기글: 'true', 최신글: 'false' },
    );
  });
});
