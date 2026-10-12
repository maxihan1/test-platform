import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-054',
  name: '휴대폰 숫자 9자를 적으면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

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

  await test.step('회원가입 휴대폰 칸에 숫자 9자를 적고 칸을 벗어난다', async () => {
    await 회원가입.적고옮기기(회원가입.휴대폰, '010123456');
    await verify('휴대폰 숫자 9자를 적으면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다', await 보이는글(회원가입.안내('phone')), '휴대폰 번호는 숫자 10~11자입니다');
  });

  await test.step('회원가입 휴대폰 칸에 숫자 10자를 적고 칸을 벗어난다', async () => {
    await 회원가입.적고옮기기(회원가입.휴대폰, '0101234567');
    await verify('휴대폰 숫자 10자를 적으면 휴대폰 오류 문구가 보이지 않는다', await 보이는글(회원가입.안내('phone')), '');
  });

  await test.step('회원가입 휴대폰 칸에 숫자 11자를 적고 칸을 벗어난다', async () => {
    await 회원가입.적고옮기기(회원가입.휴대폰, '01012345678');
    await verify('휴대폰 숫자 11자를 적으면 휴대폰 오류 문구가 보이지 않는다', await 보이는글(회원가입.안내('phone')), '');
  });
});
