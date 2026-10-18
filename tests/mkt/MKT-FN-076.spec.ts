import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-076',
  name: '비밀번호 확인이 다르면 「비밀번호가 일치하지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    비밀번호: z.string().describe('가입할 비밀번호 — 영문·숫자·특수문자를 포함한 8~20자').default('Demo123!'),
    다른확인값: z.string().describe('비밀번호 확인 칸에 적을 값 — 비밀번호와 다른 글자').default('Demo1234!'),
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

  await test.step('비밀번호와 다른 값을 비밀번호 확인 칸에 적는다', async () => {
    await 가입.입력하기('password', params.비밀번호);
    await 가입.입력하기('passwordConfirm', params.다른확인값);
    await 두프레임뒤(page);
    await verify('비밀번호 확인이 다르면 「비밀번호가 일치하지 않습니다」가 보인다', await 가입.오류문구('passwordConfirm').isVisible(), true);
  });
});
