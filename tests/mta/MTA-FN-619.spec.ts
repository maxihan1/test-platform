import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 토스트 } from './components/toast.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-619',
  name: '「<@이름>로 이동」에서 계정이 없으면 토스트 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색할계정: z.string().describe('검색창에 적을 없는 계정 — @ 로 시작하고 서버에 없는 이름').default('@zzqqxxkk'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);
  const 토스트창 = new 토스트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에 없는 계정 「@zzqqxxkk」를 적고 이동 줄을 누른다', async () => {
    await 검색.열기();
    await 검색.적기(params.검색할계정);
    await 검색.줄누르기('로 이동');
    await verify('「<@이름>로 이동」에서 계정이 없으면 토스트 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다', await 토스트창.글(), '검색어에 대한 결과를 찾을 수 없습니다');
  }, { capture: true });
});
