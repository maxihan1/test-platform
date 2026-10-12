import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-210',
  name: '비밀번호를 맞게 다시 입력하면 이름 · 이메일 · 휴대폰 · 관심 분야 칸이 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 프로필 = new 회원정보수정화면(page);

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새로 가입한 회원으로 로그인했는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('회원정보 수정에서 비밀번호를 다시 입력하고 「비밀번호 확인」을 누른다', async () => {
      await 프로필.열기();
      await 프로필.비밀번호확인하기(정보.password);
      await verify(
        '비밀번호를 맞게 다시 입력하면 이름 · 이메일 · 휴대폰 · 관심 분야 칸이 보인다',
        [await 프로필.이름.isVisible(), await 프로필.이메일.isVisible(), await 프로필.휴대폰.isVisible(), await 프로필.관심분야('패션').isVisible(), await 프로필.관심분야('전자기기').isVisible(), await 프로필.관심분야('도서').isVisible(), await 프로필.관심분야('식품').isVisible()],
        [true, true, true, true, true, true, true],
      );
    });
  } finally {
    await 탈퇴(page.request);
  }
});
