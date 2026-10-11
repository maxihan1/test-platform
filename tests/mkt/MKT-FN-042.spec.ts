import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-042',
  name: '이벤트 띠의 X 를 누르면 띠가 보이지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 이벤트 띠가 올 때까지 기다린다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.이벤트띠.waitFor();
  });

  await test.step('이벤트 띠가 보이는지 확인한다', async () => {
    await verify('이벤트 띠가 보인다', await 홈.이벤트띠.isVisible(), true, { blocker: true });
  });

  await test.step('이벤트 띠의 X 를 누른다', async () => {
    await 홈.이벤트띠닫기.click();
    await verify('이벤트 띠의 X 를 누르면 띠가 보이지 않는다', await 홈.이벤트띠.isVisible(), false);
  });
});
