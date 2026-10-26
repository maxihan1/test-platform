import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-545',
  name: '비회원이 이용약관 주소를 열면 로그인 화면으로 가지 않고 이용약관 본문이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 이용약관 = new 이용약관화면(page);
  await 안내창막기(page);

  await test.step('이용약관 주소(/terms)를 연다', async () => {
    await 이용약관.열기();
    await verify('비회원이다', await 이용약관.머리.로그인.isVisible(), true, { blocker: true });
    await verify('이용약관 주소가 그대로 열려 있다', await 이용약관.현재주소(), '/terms', { blocker: true });
  });

  await test.step('이용약관 본문을 확인한다', async () => {
    await 이용약관.본문.waitFor();
    await verify('비회원이 이용약관 주소를 열면 로그인 화면으로 가지 않고 이용약관 본문이 보인다', await 이용약관.첫조제목(), '제1조 (목적)');
  });
});
