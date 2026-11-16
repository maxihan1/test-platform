import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-125',
  name: '글 카드 머리에 표시 이름 · 「<시간> · @<계정>」 · 「추가 옵션」 버튼이 보인다',
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

  await test.step('홈 첫 글 카드 머리를 확인한다', async () => {
    await 뜰때까지(driver, 홈.첫시간줄, 15_000);
    const 이름 = await verify('표시 이름이 보인다', await 뜰때까지(driver, 홈.첫이름, 10_000), true);
    const 시간줄 = await verify('「<시간> · @<계정>」이 보인다', /^.+ · @\S+$/.test(await driver.$(홈.첫시간줄).getText()), true);
    const 옵션 = await verify('「추가 옵션」 버튼이 보인다', await driver.$(홈.첫더보기).getAttribute('content-desc'), '추가 옵션');
    await verify('글 카드 머리에 표시 이름 · 「<시간> · @<계정>」 · 「추가 옵션」 버튼이 보인다', 이름 && 시간줄 && 옵션, true);
  });
});
