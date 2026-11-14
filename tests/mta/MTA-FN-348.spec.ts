import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 서버 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-348',
  name: '검색에 @이름 · 이름@도메인 꼴을 넣으면 「<@이름@도메인>로 이동」 줄이 위에 붙고 도메인을 안 쓰면 내 서버 도메인이 붙는다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색할계정: z.string().describe('검색창에 적을 계정 — @ 로 시작하고 도메인이 없는 글').default('@hana_photo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에 「@hana_photo」를 적는다', async () => {
    await 검색.열기();
    await 검색.적기(params.검색할계정);
    const 판정1 = await verify('「<@이름@도메인>로 이동」 줄이 보인다', await 문구가보이나(driver, '<@이름@도메인>로 이동'), true);
    const 판정2 = await verify('도메인을 쓰지 않은 이름 뒤에 내 서버 도메인이 붙은 이동 줄이 보인다', await 문구가보이나(driver, '<이름>@' + 서버 + '로 이동'), true);
    await verify('검색에 @이름 · 이름@도메인 꼴을 넣으면 「<@이름@도메인>로 이동」 줄이 위에 붙고 도메인을 안 쓰면 내 서버 도메인이 붙는다', 판정1 && 판정2, true);
  }, { capture: true });
});
