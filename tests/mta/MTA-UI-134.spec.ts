import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 글자요소찾기, 문구찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-134',
  name: '투표 카드에 항목 · 「투표」 · 「결과 보기」 · 「n 투표」 · 「n시간 남았습니다」가 보이고 다중 선택이면 「한 개 혹은 여러 개를 선택하세요」, 마감되면 「마감됨」이 보인다',
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
  await test.step('minjun_dev 프로필에서 투표 글을 찾는다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    const 투표 = await verify('투표 카드에 「투표」가 보인다', await 글자요소찾기(driver, '투표'), true);
    const 결과보기 = await verify('투표 카드에 「결과 보기」가 보인다', await 글자요소찾기(driver, '결과 보기'), true);
    const 투표수 = await verify('투표 카드에 「n 투표」가 보인다', await 문구찾기(driver, 'n 투표'), true);
    const 남은시간 = await verify('투표 카드에 「n시간 남았습니다」가 보인다', await 문구찾기(driver, 'n시간 남았습니다'), true);
    const 다중 = await verify('다중 선택 투표 카드에 「한 개 혹은 여러 개를 선택하세요」가 보인다', await 문구찾기(driver, '한 개 혹은 여러 개를 선택하세요'), true);
    const 마감 = await verify('마감된 투표 카드에 「마감됨」이 보인다', await 문구찾기(driver, '마감됨'), true);
    await verify('투표 카드에 항목 · 「투표」 · 「결과 보기」 · 「n 투표」 · 「n시간 남았습니다」가 보이고 다중 선택이면 「한 개 혹은 여러 개를 선택하세요」, 마감되면 「마감됨」이 보인다', 투표 && 결과보기 && 투표수 && 남은시간 && 다중 && 마감, true);
  }, { capture: true });
});
