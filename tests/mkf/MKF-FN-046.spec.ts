import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-046',
  name: '중복 확인을 하지 않으면 「가입하기」를 눌러도 가입 완료 화면으로 가지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '결정 테이블'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);
  const 첫정보 = 새회원정보();
  const 둘째정보 = 새회원정보();
  const 셋째정보 = 새회원정보();

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('회원가입 화면을 연다', async () => {
      await 방해막기(page);
      await 회원가입.열기();
    });

    await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
      await 회원가입.제목.waitFor();
      await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
    });

    await test.step('회원가입 칸과 필수 약관을 다 채우고 「중복 확인」은 누르지 않는다', async () => {
      await 회원가입.칸채우기(첫정보);
      await 회원가입.필수약관켜기();
      await 회원가입.꺼진가입하기눌러보기();
      await verify('중복 확인을 하지 않으면 「가입하기」를 눌러도 가입 완료 화면으로 가지 않는다', 경로(page), 회원가입화면.주소);
    });

    await test.step('회원가입 화면을 다시 열어 칸과 필수 약관을 채우고 중복 확인을 마친다', async () => {
      await 회원가입.열기();
      await 회원가입.제목.waitFor();
      await 회원가입.가입준비하고기다리기(둘째정보);
      await verify('중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
    });

    await test.step('중복 확인을 마친 뒤 아이디를 고친다', async () => {
      await 회원가입.아이디.press('x');
      await 회원가입.꺼진가입하기눌러보기();
      await verify('중복 확인 뒤 아이디를 고치면 「가입하기」를 눌러도 가입 완료 화면으로 가지 않는다', 경로(page), 회원가입화면.주소);
    });

    await test.step('이미 있는 아이디 「admin」으로 중복 확인을 하고 나머지를 채운다', async () => {
      await 회원가입.열기();
      await 회원가입.제목.waitFor();
      await 회원가입.아이디.fill('admin');
      await 회원가입.중복확인하고기다리기();
      await verify('「admin」은 이미 사용 중인 아이디다', await 회원가입.안내('loginId').innerText(), '이미 사용 중인 아이디입니다', { blocker: true });
      await 회원가입.비밀번호.fill(셋째정보.password);
      await 회원가입.비밀번호확인.fill(셋째정보.password);
      await 회원가입.이름.fill(셋째정보.name);
      await 회원가입.이메일.fill(셋째정보.email);
      await 회원가입.필수약관켜기();
      await 회원가입.꺼진가입하기눌러보기();
      await verify('이미 사용 중인 아이디면 「가입하기」를 눌러도 가입 완료 화면으로 가지 않는다', 경로(page), 회원가입화면.주소);
    });
  } finally {
    await 가입자정리하기(page.request, 첫정보);
    await 가입자정리하기(page.request, { loginId: `${둘째정보.loginId}x`, password: 둘째정보.password });
    await 가입자정리하기(page.request, 둘째정보);
  }
});
