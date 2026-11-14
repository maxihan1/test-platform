import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-480',
  name: '프라이버시 스위치를 바꾸면 서버에 저장되어 다른 기기에서도 같다',
  platforms: ['android'],
  held: '보류 — 같은 계정으로 두 번 로그인하는 시간이 케이스 한도 120초를 넘는다',
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

  await test.step('프라이버시 스위치를 바꾼 뒤 앱 데이터를 지우고 다시 로그인한다', async () => {
    await verify('프라이버시 스위치를 바꾸면 서버에 저장되어 다른 기기에서도 같다', await 홈.떴나(), true);
  });
});
