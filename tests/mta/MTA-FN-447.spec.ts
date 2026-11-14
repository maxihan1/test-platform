import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-447',
  name: '글에서 신고를 시작하면 글 고르기에서 그 글이 미리 선택되어 있다',
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
  const 신고 = new 신고화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 글 더보기에서 신고를 시작해 글 고르기까지 간다', async () => {
    const 본문 = await 신고.홈첫글본문();
    await 신고.홈첫글에서열기();
    await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true);
    await 신고.이유고르기('스팸입니다');
    await 신고.다음누르기();
    await verify('글 고르기 질문이 보인다', await 신고.글자보이나('이 신고에 대해서 더 참고해야 할 게시물이 있나요?', 15_000), true);
    await verify('글에서 신고를 시작하면 글 고르기에서 그 글이 미리 선택되어 있다', await 신고.글체크됨(본문), 'true');
  }, { capture: true });
});
