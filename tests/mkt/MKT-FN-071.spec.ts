import { defineCase, test, verify } from '@platform/kit';
import { 새회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-071',
  name: '중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 정보 = 새회원정보();

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('중복 확인 없이 나머지 필수 칸과 필수 약관을 채운다', async () => {
    await 가입.필수칸채우기(정보);
    await 가입.필수약관켜기();
    await verify('중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('중복 확인을 마친 뒤 아이디를 한 글자 고친다', async () => {
    await 가입.중복확인하기();
    await 가입.안내('loginId').getByText('사용 가능한 아이디입니다').waitFor();
    await verify('중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.입력하기('loginId', `${정보.loginId.slice(0, -1)}${정보.loginId.endsWith('z') ? 'y' : 'z'}`);
    await verify('중복 확인 뒤 아이디를 고치면 「가입하기」 버튼이 다시 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });
});
