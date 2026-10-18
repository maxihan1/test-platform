import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-074',
  name: '특수문자가 없는 비밀번호를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    특수문자가없는비밀번호: z.string().describe('특수문자가 없는 비밀번호 — 영문과 숫자만 든 8~20자').default('abcd1234'),
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

  await test.step('비밀번호 칸에 특수문자가 없는 「abcd1234」를 적는다', async () => {
    await 가입.입력하기('password', params.특수문자가없는비밀번호);
    await 두프레임뒤(page);
    await verify('특수문자가 없는 비밀번호를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 가입.오류문구('password').isVisible(), true);
  });
});
