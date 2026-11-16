import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-126',
  name: '글 카드 시간이 「방금」 · 「n초 전」 · 「n분 전」 · 「n시간 전」 · 「n일 전」 가운데 하나로 보인다',
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 글 카드 시간을 읽는다', async () => {
    await 뜰때까지(driver, 홈.첫시간줄, 15_000);
    const 시간 = ((await driver.$(홈.첫시간줄).getText()).split(' · ')[0] ?? '').trim();
    await verify('글 카드 시간이 「방금」 · 「n초 전」 · 「n분 전」 · 「n시간 전」 · 「n일 전」 가운데 하나로 보인다', /^(방금|\d+\s*초 전|\d+\s*분 전|\d+\s*시간 전|\d+\s*일 전)$/.test(시간), true);
  });
});
