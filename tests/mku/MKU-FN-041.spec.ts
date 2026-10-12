import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-041',
  name: '추천 상품을 오른쪽으로 넘기면 처음에 가려 있던 상품이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  let 처음에가린것: number[] = [];

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
  });

  await test.step('추천 상품 일부가 가려져 있는지 확인한다', async () => {
    await 홈.추천카드들.first().waitFor();
    처음에가린것 = await 홈.가려진카드번호들();
    await verify('처음에 가려진 추천 상품이 한 개 이상 있다', 처음에가린것.length > 0, true, { blocker: true });
  });

  await test.step('추천 상품 「다음」을 누른다', async () => {
    await 홈.추천다음.click();
    await 홈.스크롤멈출때까지기다리기();
    const 넘긴뒤가린것 = await 홈.가려진카드번호들();
    await verify(
      '추천 상품을 오른쪽으로 넘기면 처음에 가려 있던 상품이 보인다',
      처음에가린것.some((번호) => !넘긴뒤가린것.includes(번호)),
      true,
    );
  });
});
