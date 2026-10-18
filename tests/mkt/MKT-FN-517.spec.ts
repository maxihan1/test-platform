import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-517',
  name: '비밀번호 칸에 21자를 적으면 20자까지만 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    비밀번호21자: z.string().describe('비밀번호 21자 — 영문·숫자·특수문자를 포함한 21자').default('Abcdefghij12345678!@#'),
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

  await test.step('비밀번호 칸에 21자를 적는다', async () => {
    await 가입.입력하기('password', params.비밀번호21자);
    await verify('비밀번호 칸에 21자를 적으면 20자까지만 들어간다', `${(await 가입.칸값('password')).length}자 ${await 가입.칸값('password')}`, `20자 ${params.비밀번호21자.slice(0, 20)}`);
  });
});
