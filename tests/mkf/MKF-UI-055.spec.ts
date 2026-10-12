import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-055',
  name: '홈 탭은 처음에 「인기글」이 골라져 좋아요 순 글 5건이 보인다',
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
    await 홈.글링크들.first().waitFor();
    const 좋아요들 = (await 홈.글항목들.allInnerTexts()).map((글) => Number(/좋아요 (\d+)/.exec(글)?.[1] ?? Number.NaN));
    await verify(
      '홈 탭은 처음에 「인기글」이 골라져 좋아요 순 글 5건이 보인다',
      {
        골라진탭: await 홈.인기글탭.getAttribute('aria-selected'),
        건수: 좋아요들.length,
        좋아요순: 좋아요들.every((수, 번째) => 번째 === 0 || (좋아요들[번째 - 1] ?? 0) >= 수),
      },
      { 골라진탭: 'true', 건수: 5, 좋아요순: true },
    );
  });
});
