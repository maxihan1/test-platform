import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-030',
  name: '홈 배너 좌우에 「이전」 · 「다음」 화살표와 아래에 점 3개가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.배너.그려질때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈 배너를 확인한다', async () => {
    const 이전 = await verify('홈 배너 왼쪽에 「이전」 화살표가 보인다', await 홈.배너.이전.isVisible(), true);
    const 다음 = await verify('홈 배너 오른쪽에 「다음」 화살표가 보인다', await 홈.배너.다음.isVisible(), true);
    const 점 = await verify('홈 배너 아래에 점이 3개 보인다', await 홈.배너.점들.count(), 3);
    await verify('홈 배너 좌우에 「이전」 · 「다음」 화살표와 아래에 점 3개가 보인다', 이전 && 다음 && 점, true);
  });
});
