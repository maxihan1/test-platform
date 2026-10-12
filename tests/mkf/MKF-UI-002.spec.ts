import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-002',
  name: '비회원 홈 머리글 오른쪽에 「로그인」 · 「회원가입」 링크가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 머리.로고.waitFor();
    await verify(
      '비회원 홈 머리글 오른쪽에 「로그인」 · 「회원가입」 링크가 보인다',
      await 보이는이름들({ '「로그인」': 머리.로그인, '「회원가입」': 머리.회원가입 }),
      '「로그인」, 「회원가입」',
    );
  });
});
