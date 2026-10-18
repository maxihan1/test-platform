import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-516',
  name: '아이디 칸에 13자를 적으면 12자까지만 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    아이디13자: z.string().describe('아이디 13자 — 영문 소문자와 숫자 13자').default('abcdefgh12345'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('아이디 칸에 13자 「abcdefgh12345」를 적는다', async () => {
    await 가입.입력하기('loginId', params.아이디13자);
    await verify('아이디 칸에 13자를 적으면 12자까지만 들어간다', `${(await 가입.칸값('loginId')).length}자 ${await 가입.칸값('loginId')}`, `12자 ${params.아이디13자.slice(0, 12)}`);
  });
});
