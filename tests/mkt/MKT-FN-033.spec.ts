import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-033',
  name: '아이디가 규칙에 맞지 않으면 안내 문구가 보이고 중복 확인 결과가 문구로 보인다',
  precondition: ['비회원이다', '회원가입 화면이 열려 있다'],
  params: z.object({
    takenId: z.string().min(1).describe('이미 있는 아이디').default('user1'),
  }),
  expected: z.object({
    idRule: z.string().describe('아이디 규칙 문구').default('아이디는 영문 소문자·숫자 4~12자입니다'),
    taken: z.string().describe('이미 있는 아이디 문구').default('이미 사용 중인 아이디입니다'),
    available: z.string().describe('사용 가능한 아이디 문구').default('사용 가능한 아이디입니다'),
    shown: z.boolean().describe('문구가 보이는지').default(true),
    notShown: z.boolean().describe('문구가 보이는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 회원가입화면(page);
  const 없는아이디 = `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('아이디 칸에 대문자가 든 값을 적는다', async () => {
    await 화면.아이디.fill('ABcd1234');
    await verify(
      '아이디가 영문 소문자와 숫자 4~12자 규칙에 맞지 않으면 입력칸 아래에 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다',
      await 화면.빨간문구(expected.idRule).isVisible(),
      expected.shown,
    );
  });

  await test.step('아이디 칸에 소문자 3자를 적는다', async () => {
    await 화면.아이디.fill('abc');
    await verify('아이디에 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다', await 화면.문구(expected.idRule).isVisible(), expected.shown);
  });

  await test.step('아이디 칸에 소문자 4자를 적는다', async () => {
    await 화면.아이디.fill('abcd');
    await verify('아이디에 4자를 적으면 아이디 규칙 문구가 보이지 않는다', await 화면.문구(expected.idRule).isVisible(), expected.notShown);
  });

  await test.step('아이디 칸에 소문자 12자를 적는다', async () => {
    await 화면.아이디.fill('abcdefghijkl');
    await verify('아이디에 12자를 적으면 아이디 규칙 문구가 보이지 않는다', await 화면.문구(expected.idRule).isVisible(), expected.notShown);
  });


  await test.step('이미 있는 아이디를 적고 「중복 확인」을 누른다', async () => {
    await 화면.아이디.fill(params.takenId);
    await 화면.중복확인을한다();
    await verify('이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다', await 화면.문구(expected.taken).isVisible(), expected.shown);
  });

  await test.step('없는 아이디를 적고 「중복 확인」을 누른다', async () => {
    await 화면.아이디.fill(없는아이디);
    await 화면.중복확인을한다();
    await verify('없는 아이디로 「중복 확인」을 누르면 「사용 가능한 아이디입니다」가 보인다', await 화면.문구(expected.available).isVisible(), expected.shown);
  });
});
