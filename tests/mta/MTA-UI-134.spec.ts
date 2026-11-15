import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-134',
  name: '투표 카드에 항목 · 「투표」 · 「결과 보기」 · 「투표」 수 · 「남았습니다」가 보이고 다중 선택 투표에 「한 개 혹은 여러 개를 선택하세요」, 마감 투표에 「마감됨」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 의 투표 글 카드를 찾는다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    const 투표 = await verify('「투표」가 보인다', await 뜰때까지(driver, 카드.굴려서글자('투표'), 25_000), true);
    const 결과보기 = await verify('「결과 보기」가 보인다', await 뜰때까지(driver, 카드.굴려서글자('결과 보기'), 25_000), true);
    const 남음 = await verify('「남았습니다」가 보인다', await 뜰때까지(driver, 카드.굴려서글자포함('남았습니다'), 25_000), true);
    const 다중 = await verify('「한 개 혹은 여러 개를 선택하세요」가 보인다', await 뜰때까지(driver, 카드.굴려서글자포함('한 개 혹은 여러 개를 선택하세요'), 25_000), true);
    const 마감 = await verify('「마감됨」이 보인다', await 뜰때까지(driver, 카드.굴려서글자포함('마감됨'), 25_000), true);
    await verify('투표 카드에 항목 · 「투표」 · 「결과 보기」 · 「투표」 수 · 「남았습니다」가 보이고 다중 선택 투표에 「한 개 혹은 여러 개를 선택하세요」, 마감 투표에 「마감됨」이 보인다', 투표 && 결과보기 && 남음 && 다중 && 마감, true);
  });
});
