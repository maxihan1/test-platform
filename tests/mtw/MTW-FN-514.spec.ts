import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-514',
  name: '「@hana_photo」로 검색하면 hana_photo 프로필로 간다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 검색 = new 검색화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('왼쪽 열에 검색칸이 보인다', await 검색.검색칸.isVisible(), true, { blocker: true });
  });

  await test.step('검색칸에 「@hana_photo」를 넣고 Enter 를 친다', async () => {
    await 검색.찾기('@hana_photo');
    await verify('「@hana_photo」로 검색하면 hana_photo 프로필로 간다', await 검색.프로필로갔나('hana_photo'), true);
  });

  await test.step('검색칸에 「#오늘의사진」을 넣고 Enter 를 친다', async () => {
    await 검색.찾기('#오늘의사진');
    await verify('「#오늘의사진」 검색은 해시태그 화면으로 간다', await 검색.태그로갔나('오늘의사진'), true);
  });
});
