import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-087',
  name: '이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다',
  techniques: ['동등 분할', '결정 테이블'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 기본 = 임시회원정보();
  const 회원 = { ...기본, loginId: 기본.loginId.slice(0, 10) };

  await test.step('회원가입 화면 아이디 칸에 「user2」를 적고 「중복 확인」을 누른다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.아이디칸.fill('user2');
    await 화면.중복확인하기();
    await verify(
      '이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다',
      await 화면.오류문구('loginId').filter({ hasText: '이미 사용 중인 아이디입니다' }).isVisible(),
      true,
    );
  });

  await test.step('필수 칸과 필수 약관을 다 채우고 「중복 확인」은 누르지 않는다', async () => {
    await 화면.필수칸채우기(회원);
    await 화면.필수약관켜기();
    await verify('중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });

  await test.step('「중복 확인」을 누른 뒤 아이디 끝에 한 글자를 더 적는다', async () => {
    await 화면.중복확인하기();
    await verify('중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true, { blocker: true });
    await 화면.아이디칸.pressSequentially('x');
    await verify('확인 뒤 아이디를 고치면 「가입하기」 버튼이 다시 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });
});
