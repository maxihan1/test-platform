import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-312',
  name: '프로필 항목의 긴 값은 누르면 전체 창이 뜨고, 항목이 많으면 「Show all fields」가 보인다',
  platforms: ['android'],
  held: '보류 — 프로필 항목 긴 값의 요소 주소',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필 항목의 긴 값을 누른다', async () => {
    await verify('프로필 항목의 긴 값은 누르면 전체 창이 뜨고, 항목이 많으면 「Show all fields」가 보인다', await 문구가보이나(driver, 'Show all fields'), true);
  });
});
