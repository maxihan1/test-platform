import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-114',
  name: '필수 약관을 하나만 켜면 「가입하기」 버튼이 눌리지 않는다',
  techniques: ['결정 테이블'],
  precondition: ['비회원이다', '중복 확인을 마치고 필수 칸을 다 채웠다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 회원 = 임시회원정보();

  await test.step('필수 칸을 채우고 중복 확인을 마친다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await 화면.필수칸채우기(회원);
    await 화면.중복확인하기();
  });

  await test.step('중복 확인을 마치고 필수 칸을 다 채웠는지 확인한다', async () => {
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify(
      '중복 확인을 마친 아이디 칸에 「사용 가능한 아이디입니다」가 보인다',
      await 화면.오류문구('loginId').filter({ hasText: '사용 가능한 아이디입니다' }).isVisible(),
      true,
      { blocker: true },
    );
  });

  await test.step('필수 약관 가운데 「(필수) 이용약관 동의」만 켠다', async () => {
    await 화면.이용약관동의.check();
    await verify('필수 약관을 하나만 켜면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });

  await test.step('필수 약관 둘을 켜고 이메일 칸을 비운다', async () => {
    await 화면.개인정보동의.check();
    await 화면.이메일칸.fill('');
    await verify('필수 칸이 하나라도 비면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });
});
