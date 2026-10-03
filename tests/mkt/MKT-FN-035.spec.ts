import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-035',
  name: '비밀번호를 규칙에 맞지 않게 적으면 안내 문구가 보이고 눈 모양 버튼으로 글자를 보이거나 가린다',
  precondition: ['비회원이다', '회원가입 화면이 열려 있다', '회원가입 화면에 비밀번호를 적어 두었다'],
  params: z.object({}),
  expected: z.object({
    pwRule: z.string().describe('비밀번호 규칙 문구').default('비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다'),
    mismatch: z.string().describe('비밀번호 불일치 문구').default('비밀번호가 일치하지 않습니다'),
    shown: z.boolean().describe('문구가 보이는지').default(true),
    shownType: z.string().describe('비밀번호 칸 종류').default('text'),
    hiddenType: z.string().describe('가려진 비밀번호 칸 종류').default('password'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('비밀번호 칸에 숫자만 적는다', async () => {
    await 화면.비밀번호.fill('12345678');
    await verify(
      '비밀번호가 영문 · 숫자 · 특수문자 8~20자 규칙에 맞지 않으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
      await 화면.문구(expected.pwRule).isVisible(),
      expected.shown,
    );
  });

  await test.step('비밀번호 칸에 영문 · 숫자 · 특수문자를 섞어 7자를 적는다', async () => {
    await 화면.비밀번호.fill('Ab1!xyz');
    await verify('비밀번호에 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 화면.문구(expected.pwRule).isVisible(), expected.shown);
  });


  await test.step('비밀번호 확인 칸에 비밀번호와 다른 값을 적는다', async () => {
    await 화면.비밀번호.fill('Mkt!2026pw');
    await 화면.비밀번호확인.fill('Other!2026x');
    await verify('비밀번호 확인이 비밀번호와 다르면 「비밀번호가 일치하지 않습니다」가 보인다', await 화면.문구(expected.mismatch).isVisible(), expected.shown);
  });

  await test.step('비밀번호 칸 오른쪽 눈 모양 버튼을 누른다', async () => {
    await 화면.눈버튼.click();
    await verify('눈 모양 버튼을 누르면 입력한 비밀번호가 글자로 보인다', await 화면.입력종류(화면.비밀번호), expected.shownType);
  });

  await test.step('눈 모양 버튼을 다시 누른다', async () => {
    await 화면.눈버튼.click();
    await verify('눈 모양 버튼을 다시 누르면 비밀번호가 가려진다', await 화면.입력종류(화면.비밀번호), expected.hiddenType);
  });
});
