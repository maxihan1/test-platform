import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-099',
  name: '이름을 비우면 「가입하기」 버튼이 눌리지 않는다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '필수 칸과 약관은 다 맞게 채웠다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 회원 = 임시회원정보();

  await test.step('필수 칸과 필수 약관을 채우고 중복 확인을 마친다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await 화면.필수칸채우기(회원);
    await 화면.중복확인하기();
    await 화면.필수약관켜기();
  });

  await test.step('필수 칸과 약관을 다 채웠는지 확인한다', async () => {
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify('필수 칸과 약관을 다 채우면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true, { blocker: true });
  });

  await test.step('이름 칸을 비운다', async () => {
    await 화면.이름칸.fill('');
    await verify('이름을 비우면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });

  await test.step('이메일 칸에 「abc」를 적는다', async () => {
    await 화면.이름칸.fill(회원.name);
    await 화면.이메일칸.fill('abc');
    await verify('이메일이 형식에 맞지 않으면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼.isEnabled(), false);
  });

  await test.step('휴대폰 칸에 「01a-2b3」을 적는다', async () => {
    await 화면.이메일칸.fill(회원.email);
    await 화면.휴대폰칸.fill('01a-2b3');
    await verify('휴대폰 칸에는 숫자 「0123」만 남는다', await 화면.휴대폰칸.inputValue(), '0123');
  });
});
