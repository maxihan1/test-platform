import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아래에있나 } from './helpers/screen-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-343',
  name: '「아이디」에 공백만 넣고 「로그인」을 누르면 빈 값처럼 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    공백아이디: z.string().describe('아이디 칸에 넣을 글자 — 공백만 있는 글자').default('   '),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('「아이디」에 공백만 넣고 「비밀번호」를 적어 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.공백아이디, params.loginPassword ?? '');
    const 글 = await verify('「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글(), '아이디와 비밀번호를 입력하세요');
    const 아래 = await verify('안내가 입력칸 아래에 있다', await 아래에있나(로그인.비밀번호칸, 로그인.오류), true);
    await verify('「아이디」에 공백만 넣고 「로그인」을 누르면 빈 값처럼 「아이디와 비밀번호를 입력하세요」가 보인다', 글 && 아래, true);
  });
});
