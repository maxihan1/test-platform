import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-237',
  name: '확장 푸터 인용 수를 누르면 제목 「n 인용함」 인용 글 목록이 열린다',
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
  const 상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('글 상세 확장 푸터의 인용 수를 누른다', async () => {
    await 상세.홈첫글열기();
    await verify('글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
    await 상세.인용수누르기();
    const 넘어감 = await verify('글 상세 확장 푸터가 사라진다', await 상세.푸터사라졌나(), true);
    const 제목 = await verify('인용 글 목록 제목 「n 인용함」이 보인다', await 상세.글보이나('n 인용함'), true);
    await verify('확장 푸터 인용 수를 누르면 제목 「n 인용함」 인용 글 목록이 열린다', 넘어감 && 제목, true);
  }, { capture: true });
});
