import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-520',
  name: '형식에 맞지 않는 이메일을 적으면 「이메일 형식이 올바르지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    형식이틀린이메일: z.string().describe('형식이 틀린 이메일 — 점이 없는 도메인').default('a@b'),
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

  await test.step('이메일 칸에 「a@b」를 적는다', async () => {
    await 가입.입력하기('email', params.형식이틀린이메일);
    await 두프레임뒤(page);
    await verify('형식에 맞지 않는 이메일을 적으면 「이메일 형식이 올바르지 않습니다」가 보인다', await 가입.오류문구('email').isVisible(), true);
  });

  await test.step('이메일 칸을 눌렀다가 비운 채 다른 칸으로 옮긴다', async () => {
    await 가입.칸을비운채옮기기('email');
    await verify('이메일 칸을 비우면 「이메일 형식이 올바르지 않습니다」가 보인다', await 가입.오류문구('email').isVisible(), true);
  });
});
