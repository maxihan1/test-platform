import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-372',
  name: '글 더보기 「<이름> 신고」를 누르면 제목 「게시물 신고」 · 질문 「이 게시물에 어떤 문제가 있나요?」 · 「가장 알맞은 것을 선택하세요」 · 「다음」이 보인다',
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
  await test.step('홈 글 더보기에서 신고 항목을 누른다', async () => {
    await 신고.홈첫글에서열기();
    const 제목 = await verify('제목 「게시물 신고」가 보인다', await 신고.글자보이나('게시물 신고', 15_000), true);
    const 질문 = await verify('질문 「이 게시물에 어떤 문제가 있나요?」가 보인다', await 신고.글자보이나('이 게시물에 어떤 문제가 있나요?'), true);
    const 안내 = await verify('「가장 알맞은 것을 선택하세요」가 보인다', await 신고.글자보이나('가장 알맞은 것을 선택하세요'), true);
    const 다음 = await verify('「다음」 단추가 보인다', await 신고.이유목록떴나(), true);
    await verify('글 더보기 「<이름> 신고」를 누르면 제목 「게시물 신고」 · 질문 「이 게시물에 어떤 문제가 있나요?」 · 「가장 알맞은 것을 선택하세요」 · 「다음」이 보인다', 제목 && 질문 && 안내 && 다음, true);
  }, { capture: true });
});
