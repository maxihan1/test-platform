import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-234',
  name: '글 상세 확장 푸터에 시간 · 날짜 · 「n개의 좋아요」 · 「n 님이 부스트했습니다」 · 「n 인용함」(0이어도)이 보인다',
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
  await test.step('홈 글 카드 본문을 눌러 글 상세를 연다', async () => {
    await 상세.홈첫글열기();
    await verify('글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
    const 시간 = await verify('푸터에 시간이 보인다', await 상세.시간보이나(), true);
    const 날짜 = await verify('푸터에 날짜가 보인다', await 상세.날짜보이나(), true);
    const 좋아요 = await verify('푸터에 「n개의 좋아요」가 보인다', await 상세.글보이나('n개의 좋아요'), true);
    const 부스트 = await verify('푸터에 「n 님이 부스트했습니다」가 보인다', await 상세.글보이나('n 님이 부스트했습니다'), true);
    const 인용 = await verify('푸터에 「n 인용함」이 보인다', await 상세.글보이나('n 인용함'), true);
    await verify('글 상세 확장 푸터에 시간 · 날짜 · 「n개의 좋아요」 · 「n 님이 부스트했습니다」 · 「n 인용함」(0이어도)이 보인다', 시간 && 날짜 && 좋아요 && 부스트 && 인용, true);
  }, { capture: true });
});
