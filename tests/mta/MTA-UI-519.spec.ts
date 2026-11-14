import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 더보기항목들, 메뉴에있나 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-519',
  name: '링크 복사 메뉴의 한국어 문구(시스템 라이브러리 문구)는 확인 필요다',
  platforms: ['android'],
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
  await test.step('홈 글 카드 더보기를 연다', async () => {
    const 항목들 = await 더보기항목들(driver, '오늘의 카페 추천');
    await verify('링크 복사 메뉴의 한국어 문구(시스템 라이브러리 문구)는 확인 필요다', 메뉴에있나(항목들, '링크 복사'), true);
  }, { capture: true });
});
