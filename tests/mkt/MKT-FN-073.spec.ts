import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-073',
  name: '비밀번호 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    비밀번호7자: z.string().describe('비밀번호 7자 — 영문·숫자·특수문자를 포함한 7자').default('Abc123!'),
    비밀번호8자: z.string().describe('비밀번호 8자 — 영문·숫자·특수문자를 포함한 8자').default('Abc1234!'),
    비밀번호20자: z.string().describe('비밀번호 20자 — 영문·숫자·특수문자를 포함한 20자').default('Abcdefghij12345678!@'),
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

  await test.step('비밀번호 칸에 7자 「Abc123!」을 적는다', async () => {
    await 가입.입력하기('password', params.비밀번호7자);
    await 두프레임뒤(page);
    await verify('비밀번호 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 가입.오류문구('password').isVisible(), true);
  });

  await test.step('비밀번호 칸에 8자 「Abc1234!」를 적는다', async () => {
    await 가입.입력하기('password', params.비밀번호8자);
    await 두프레임뒤(page);
    await verify('비밀번호 8자를 적으면 비밀번호 오류 문구가 보이지 않는다', await 가입.오류문구('password').isVisible(), false);
  });

  await test.step('비밀번호 칸에 20자를 적는다', async () => {
    await 가입.입력하기('password', params.비밀번호20자);
    await 두프레임뒤(page);
    await verify('비밀번호 20자를 적으면 비밀번호 오류 문구가 보이지 않는다', await 가입.오류문구('password').isVisible(), false);
  });
});
