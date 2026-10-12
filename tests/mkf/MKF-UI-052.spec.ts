import { defineCase, test, verify } from '@platform/kit';

import { 상자, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-052',
  name: '홈에 위에서부터 배너 · 「인기글」 탭 · 「추천 상품」 순으로 보인다',
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
    await 홈.추천카드들.first().waitFor();
    const 자리들 = [
      { 이름: '배너', y: (await 상자(홈.배너)).y },
      { 이름: '「인기글」 탭', y: (await 상자(홈.인기글탭)).y },
      { 이름: '「추천 상품」', y: (await 상자(홈.추천영역)).y },
    ];
    const 위에서부터 = 자리들.sort((앞, 뒤) => 앞.y - 뒤.y).map((자리) => 자리.이름).join(', ');
    await verify('홈에 위에서부터 배너 · 「인기글」 탭 · 「추천 상품」 순으로 보인다', 위에서부터, '배너, 「인기글」 탭, 「추천 상품」');
  });
});
