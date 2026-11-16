import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { QR화면 } from './pages/qr.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-401',
  name: 'QR 화면에서 「저장」을 누르면 「저장됨」으로 바뀐다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 큐알 = new QR화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('내 프로필 메뉴에서 「View QR code」를 누르고 「저장」을 누른다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.메뉴열기();
    await 프로필.메뉴항목누르기('View QR code');
    await verify('QR 화면에 「저장」이 보인다', await 큐알.그려질때까지(), true, { blocker: true });
    await 큐알.저장누르기();
    await verify('QR 화면에서 「저장」을 누르면 「저장됨」으로 바뀐다', await 뜰때까지(driver, 큐알.저장됨, 10_000), true);
  });
});
