import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글공유보내기 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 공유받기화면 } from './pages/share.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-633',
  name: '계정이 둘 이상일 때 공유받기로 들어오면 「계정 선택」 창에 @이름@도메인 목록이 보이고 취소하면 닫힌다',
  platforms: ['android'],
  held: '보류 — 앱에 계정 둘을 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 공유 = new 공유받기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('계정 둘로 로그인한 앱에 글 공유를 보낸다', async () => {
    await 글공유보내기(driver, 'mta_share');
    const 선택창 = await verify('「계정 선택」 창이 뜬다', await 공유.계정선택창떴나(), true);
    const 줄 = await verify('@이름@도메인 목록이 보인다', await 공유.계정줄이보이나(), true);
    await 공유.계정선택취소누르기();
    const 닫힘 = await verify('취소한 뒤 창이 닫힌다', await 공유.계정선택창닫혔나(), true);
    await verify('계정이 둘 이상일 때 공유받기로 들어오면 「계정 선택」 창에 @이름@도메인 목록이 보이고 취소하면 닫힌다', 선택창 && 줄 && 닫힘, true);
  }, { capture: true });
});
