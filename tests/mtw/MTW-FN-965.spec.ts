import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-965',
  name: '없는 글 상세 주소를 열면 화면이 깨지지 않고 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 상세 = new 글상세화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('없는 글 번호의 상세 주소를 연다', async () => {
    await 상세.없는글열기('/@hana_photo/999999999999999999');
    await verify('없는 글 상세 주소를 열면 화면이 깨지지 않고 안내가 보인다', await 상세.없는글안내.isVisible(), true);
  });
});
