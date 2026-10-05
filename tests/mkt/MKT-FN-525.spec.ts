import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-525',
  name: '이름이 1자면 이름 칸 아래에 「이름은 2~10자입니다」가 보인다',
  techniques: ['동등 분할'],
  unconfirmed: '기획서와 다름 — 차이 D6 · D7 · D8: 이름 · 이메일 · 휴대폰 오류 문구가 기획서에 없다 (작성 요청 5873)',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면 이름 칸에 1자를 적고 칸을 벗어난다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.이름칸.fill('가');
    await 화면.칸벗어나기(화면.이름칸);
    await verify(
      '이름이 1자면 이름 칸 아래에 「이름은 2~10자입니다」가 보인다',
      (await 화면.오류문구('name').filter({ hasText: '이름은 2~10자입니다' }).isVisible()) && (await 화면.칸아래에있나('name', 화면.이름칸)),
      true,
    );
  });

  await test.step('이메일 칸에 「abc」를 적고 칸을 벗어난다', async () => {
    await 화면.이메일칸.fill('abc');
    await 화면.칸벗어나기(화면.이메일칸);
    await verify(
      '이메일 칸 아래에 「이메일 형식이 올바르지 않습니다」가 보인다',
      (await 화면.오류문구('email').filter({ hasText: '이메일 형식이 올바르지 않습니다' }).isVisible()) && (await 화면.칸아래에있나('email', 화면.이메일칸)),
      true,
    );
  });

  await test.step('휴대폰 칸에 숫자 9자를 적고 칸을 벗어난다', async () => {
    await 화면.휴대폰칸.fill('012345678');
    await 화면.칸벗어나기(화면.휴대폰칸);
    await verify(
      '휴대폰 칸 아래에 「휴대폰 번호는 숫자 10~11자입니다」가 보인다',
      (await 화면.오류문구('phone').filter({ hasText: '휴대폰 번호는 숫자 10~11자입니다' }).isVisible()) && (await 화면.칸아래에있나('phone', 화면.휴대폰칸)),
      true,
    );
  });
});
