import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-041',
  name: '「인기글」에는 좋아요가 많은 순으로 글 5건이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면 「인기글」 목록을 확인한다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('「인기글」이 선택되어 있다', await 홈.인기글탭.getAttribute('aria-selected'), 'true', { blocker: true });
    const 건수 = await verify('「인기글」에 글 5건이 보인다', (await 홈.글제목들()).length, 5);
    const 좋아요들 = (await 홈.글줄들()).map((줄) => Number(/좋아요 (\d+)/.exec(줄)?.[1] ?? -1));
    const 순서 = await verify('「인기글」의 글이 좋아요가 많은 순이다', 좋아요들.every((값, 차례) => 차례 === 0 || 좋아요들[차례 - 1] >= 값), true);
    await verify('「인기글」에는 좋아요가 많은 순으로 글 5건이 보인다', 건수 && 순서, true);
  });
});
