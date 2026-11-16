import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-373',
  name: '프로필 항목의 긴 값을 누르면 전체 값 창이 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다', '프로필 항목이 있는 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('프로필을 열 계정의 사용자명 — 프로필 항목이 있는 시드 계정').default('hana_photo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필열기(driver, params.사용자명);
    await verify('프로필에 항목 값이 보인다', await 뜰때까지(driver, 프로필.항목값들, 20_000), true, { blocker: true });
  });

  await test.step('hana_photo 프로필 항목의 긴 값을 누른다', async () => {
    const 값들 = await 프로필.글들(프로필.항목값들);
    const 긴값 = 값들.reduce((앞, 뒤) => (뒤.length > 앞.length ? 뒤 : 앞), '');
    await 프로필.항목값누르기(값들.indexOf(긴값));
    const 창뜸 = await verify('전체 값 창이 뜬다', await 창.뜰때까지(), true);
    const 전체 = await verify('창에 전체 값이 보인다', await 뜰때까지(driver, 창.안의글자(긴값), 10_000), true);
    await verify('프로필 항목의 긴 값을 누르면 전체 값 창이 뜬다', 창뜸 && 전체, true);
  });
});
