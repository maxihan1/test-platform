import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-081',
  name: '형식에 맞는 이메일을 적으면 이메일 오류 문구가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: z.object({
    이메일: z.string().describe('가입할 이메일 — 올바른 이메일 형식').default('demo@example.com'),
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

  await test.step('이메일 칸에 「demo@example.com」을 적는다', async () => {
    await 가입.입력하기('email', params.이메일);
    await 두프레임뒤(page);
    await verify('형식에 맞는 이메일을 적으면 이메일 오류 문구가 보이지 않는다', await 가입.오류문구('email').isVisible(), false);
  });
});
