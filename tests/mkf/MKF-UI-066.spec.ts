import { defineCase, test, verify } from '@platform/kit';

import { 상자, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-066',
  name: '회원가입 아이디 칸 옆에 「중복 확인」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    const 칸 = await 상자(회원가입.아이디);
    const 버튼 = await 상자(회원가입.중복확인);
    await verify(
      '회원가입 아이디 칸 옆에 「중복 확인」 버튼이 보인다',
      {
        버튼: await 회원가입.중복확인.isVisible(),
        칸오른쪽: 버튼.x >= 칸.x + 칸.width - 1,
        같은줄: Math.abs(버튼.y + 버튼.height / 2 - (칸.y + 칸.height / 2)) <= 칸.height,
      },
      { 버튼: true, 칸오른쪽: true, 같은줄: true },
    );
  });
});
