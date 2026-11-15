import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-316',
  name: '프로필 탭 줄에 「타임라인」이 보이고 상대가 켠 「미디어」 · 「추천」 탭이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    타임라인탭: z.string().describe('항상 있는 탭 이름').default('타임라인'),
    미디어탭: z.string().describe('상대가 켠 탭 이름').default('미디어'),
    추천탭: z.string().describe('상대가 켠 탭 이름').default('추천'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('hana_photo 프로필 탭을 확인한다', async () => {
    await 프로필열기(driver, 'hana_photo');
    const 타임라인 = await verify('프로필 탭 줄에 「타임라인」이 보인다', await 뜰때까지(driver, 프로필.탭(expected.타임라인탭), 10_000), true);
    const 미디어 = await verify('프로필 탭 줄에 「미디어」가 보인다', await 뜰때까지(driver, 프로필.탭(expected.미디어탭), 10_000), true);
    const 추천 = await verify('프로필 탭 줄에 「추천」이 보인다', await 뜰때까지(driver, 프로필.탭(expected.추천탭), 10_000), true);
    await verify('프로필 탭 줄에 「타임라인」이 보이고 상대가 켠 「미디어」 · 「추천」 탭이 보인다', 타임라인 && 미디어 && 추천, true);
  });
});
