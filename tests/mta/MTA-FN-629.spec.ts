import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-629',
  name: '「서버 규칙을 위반합니다」(「특정 규칙을 위반합니다」)를 고르면 규칙 고르기 「어떤 규칙을 위반했나요?」 · 「해당하는 사항을 모두 선택하세요」를 거쳐 3단계로 간다',
  platforms: ['android'],
  held: '보류 — 규칙이 있는 서버',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('규칙이 있는 서버에서 「서버 규칙을 위반합니다」를 고른다', async () => {
    await 신고.홈첫글에서열기();
    await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
    await 신고.이유고르기('서버 규칙을 위반합니다');
    await 신고.다음누르기();
    const 질문 = await verify('규칙 고르기 「어떤 규칙을 위반했나요?」가 보인다', await 신고.글자보이나('어떤 규칙을 위반했나요?', 10_000), true);
    const 안내 = await verify('「해당하는 사항을 모두 선택하세요」가 보인다', await 신고.글자보이나('해당하는 사항을 모두 선택하세요'), true);
    await 신고.규칙첫째고르기();
    await 신고.다음누르기();
    const 다음단계 = await verify('글 고르기 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」가 보인다', await 신고.글자보이나('이 신고에 대해서 더 참고해야 할 게시물이 있나요?', 10_000), true);
    await verify('「서버 규칙을 위반합니다」(「특정 규칙을 위반합니다」)를 고르면 규칙 고르기 「어떤 규칙을 위반했나요?」 · 「해당하는 사항을 모두 선택하세요」를 거쳐 3단계로 간다', 질문 && 안내 && 다음단계, true);
  }, { capture: true });
});
