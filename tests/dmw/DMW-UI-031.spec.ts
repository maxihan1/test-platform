import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-031',
  name: '배너 아래 세 번째 점을 누르면 세 번째 배너가 보인다',
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

  await test.step('배너 아래 세 번째 점을 누른다', async () => {
    await 홈.배너.점(3).click();
    await 홈.배너넘김끝날때까지();
    await verify('배너 아래 세 번째 점을 누르면 세 번째 배너가 보인다', await 홈.배너장이영역안인가(3), true);
  });

  await test.step('배너 현재 장의 점을 확인한다', async () => {
    await verify('배너 현재 장의 점은 색이 채워져 보인다', await 홈.현재점채워짐(), true);
  });
});
