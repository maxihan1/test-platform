import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-516',
  name: '서버가 컬렉션을 지원하면(API 버전 11, 앱은 10 이상) 프로필 「추천」 탭에 영어 「Collections」 구간(「by <이름>」, 「모두 보기」)이 생길 수 있고 서버의 컬렉션 활성 여부는 확인 필요다',
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
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('내 프로필 「추천」 탭을 연다', async () => {
    await 프로필.내프로필열기();
    await 프로필.탭누르기('추천');
    const 판정1 = await verify('「추천」 탭에 구간 「Collections」가 보인다', await 문구가보이나(driver, 'Collections'), true);
    const 판정2 = await verify('컬렉션 줄에 「by <이름>」이 보인다', await 문구가보이나(driver, 'by <이름>'), true);
    const 판정3 = await verify('컬렉션 구간에 「모두 보기」가 보인다', await 문구가보이나(driver, '모두 보기'), true);
    await verify('서버가 컬렉션을 지원하면(API 버전 11, 앱은 10 이상) 프로필 「추천」 탭에 영어 「Collections」 구간(「by <이름>」, 「모두 보기」)이 생길 수 있고 서버의 컬렉션 활성 여부는 확인 필요다', 판정1 && 판정2 && 판정3, true);
  }, { capture: true });
});
