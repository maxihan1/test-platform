import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-038',
  name: '홈을 다시 열면 추천 상품 순서가 앞서 본 순서와 달라진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 본순서: string[] = [];

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
  });

  await test.step('추천 상품이 보이는지 확인한다', async () => {
    await 홈.추천카드들.first().waitFor();
    본순서.push((await 홈.카드이름들()).join(', '));
    await verify('추천 상품이 8개 보인다', await 홈.추천카드들.count(), 8, { blocker: true });
  });

  await test.step('홈을 세 번 다시 연다', async () => {
    for (let 번째 = 0; 번째 < 3; 번째 += 1) {
      await 홈.열기();
      await 홈.추천카드들.first().waitFor();
      본순서.push((await 홈.카드이름들()).join(', '));
    }
    await verify(
      '홈을 다시 열면 추천 상품 순서가 앞서 본 순서와 달라진다',
      본순서.slice(1).some((순서) => 순서 !== 본순서[0]),
      true,
    );
  });
});
