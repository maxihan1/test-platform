import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-359',
  name: '이용약관 화면에 큰 제목 「이용약관」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 이용약관 = new 이용약관화면(page);
  await 안내창막기(page);

  await test.step('이용약관 화면을 연다', async () => {
    await 이용약관.열기();
    await verify('비회원이다', await 이용약관.머리.로그인.isVisible(), true, { blocker: true });
    await verify('이용약관 주소가 열려 있다', await 이용약관.현재주소(), '/terms', { blocker: true });
  });

  await test.step('이용약관 화면의 큰 제목을 확인한다', async () => {
    await verify('이용약관 화면에 큰 제목 「이용약관」이 보인다', await 이용약관.제목.큰제목.innerText(), '이용약관');
  });
});
