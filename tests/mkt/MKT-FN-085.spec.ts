import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-085',
  name: '휴대폰 칸에 영문만 적으면 칸이 비어 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    영문휴대폰: z.string().describe('영문만 적은 휴대폰 — 영문 소문자 10자').default('abcdefghij'),
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

  await test.step('휴대폰 칸에 영문 「abcdefghij」를 적는다', async () => {
    await 가입.입력하기('phone', params.영문휴대폰);
    await verify('휴대폰 칸에 영문만 적으면 칸이 비어 있다', await 가입.칸값('phone'), '');
  });
});
