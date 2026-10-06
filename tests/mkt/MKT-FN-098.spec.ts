import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-098',
  name: '이름이 1자면 「가입하기」 버튼이 눌리지 않는다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다', '이름 말고 필수 칸과 약관은 다 맞게 채웠다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 회원 = 임시회원정보();

  await test.step('이름 말고 필수 칸과 필수 약관을 채우고 중복 확인을 마친다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await 화면.필수칸채우기({ ...회원, name: '' });
    await 화면.중복확인하기();
    await 화면.필수약관켜기();
  });

  await test.step('이름 말고 필수 칸과 약관을 맞게 채웠는지 확인한다', async () => {
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify(
      '중복 확인을 마친 아이디 칸에 「사용 가능한 아이디입니다」가 보인다',
      await 화면.오류문구('loginId').filter({ hasText: '사용 가능한 아이디입니다' }).isVisible(),
      true,
      { blocker: true },
    );
  });

  await test.step('이름 칸에 1자 「가」를 적는다', async () => {
    await 화면.이름칸.fill('가');
    await verify('이름이 1자면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });

  await test.step('이름 칸에 2자 「가나」를 적는다', async () => {
    await 화면.이름칸.fill('가나');
    await verify('이름이 2자면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true);
  });

  await test.step('이름 칸에 10자를 적는다', async () => {
    await 화면.이름칸.fill('가나다라마바사아자차');
    await verify('이름이 10자면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true);
  });

  await test.step('이름 칸에 11자를 적는다', async () => {
    await 화면.이름칸.fill('가나다라마바사아자차카');
    await verify('이름 칸에 11자를 적으면 10자까지만 들어간다', await 화면.이름칸.inputValue(), '가나다라마바사아자차');
  });

  await test.step('휴대폰 칸에 숫자 9자를 적는다', async () => {
    await 화면.휴대폰칸.fill('012345678');
    await verify('휴대폰이 숫자 9자면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });

  await test.step('휴대폰 칸에 숫자 10자를 적는다', async () => {
    await 화면.휴대폰칸.fill('0123456789');
    await verify('휴대폰이 숫자 10자면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true);
  });

  await test.step('휴대폰 칸에 숫자 11자를 적는다', async () => {
    await 화면.휴대폰칸.fill('01234567890');
    await verify('휴대폰이 숫자 11자면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true);
  });

  await test.step('휴대폰 칸에 숫자 12자를 적는다', async () => {
    await 화면.휴대폰칸.fill('012345678901');
    await verify('휴대폰 칸에 숫자 12자를 적으면 11자까지만 들어간다', await 화면.휴대폰칸.inputValue(), '01234567890');
  });
});
