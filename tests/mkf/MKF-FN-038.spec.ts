import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-038',
  name: '추천 상품 카드에 마우스를 올리면 상품 설명 한 줄 말풍선이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 말풍선이 보이지 않는지 확인한다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.추천카드들.first().waitFor();
    await verify('말풍선이 보이지 않는다', await 홈.말풍선.count(), 0, { blocker: true });
  });

  await test.step('추천 상품 첫 카드에 마우스를 올린다', async () => {
    await 홈.추천카드들.first().hover();
    await 홈.말풍선.waitFor();
    const 설명 = (await 홈.말풍선.innerText()).trim();
    await verify(
      '추천 상품 카드에 마우스를 올리면 상품 설명 한 줄 말풍선이 보인다',
      { 말풍선: await 홈.말풍선.isVisible(), 설명있음: 설명 !== '', 한줄: !설명.includes('\n') },
      { 말풍선: true, 설명있음: true, 한줄: true },
    );
  });
});
