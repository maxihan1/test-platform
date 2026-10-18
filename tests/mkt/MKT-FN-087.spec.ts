import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-087',
  name: '휴대폰 칸에 「010-12ab」를 적으면 숫자 「01012」만 남는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    숫자와글자가섞인휴대폰: z.string().describe('숫자와 글자가 섞인 휴대폰 — 하이픈과 영문이 든 값').default('010-12ab'),
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

  await test.step('휴대폰 칸에 「010-12ab」를 적는다', async () => {
    await 가입.입력하기('phone', params.숫자와글자가섞인휴대폰);
    await verify('휴대폰 칸에 「010-12ab」를 적으면 숫자 「01012」만 남는다', await 가입.칸값('phone'), params.숫자와글자가섞인휴대폰.replace(/\D/g, ''));
  });
});
