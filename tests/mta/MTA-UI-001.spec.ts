import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-001',
  name: '홈 화면 하단 탭에 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」이 보이고 「홈」이 선택돼 있다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    탭글자: z.string().describe('하단 탭 글자 차례').default('홈, 둘러보기, 알림, 프로필'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 화면 하단 탭을 확인한다', async () => {
    const 글들 = await driver.$$(홈.탭.탭글자들).getElements();
    const 차례: string[] = [];
    for (const 글 of 글들) 차례.push(await 글.getText());
    const 탭들 = await verify('하단 탭 글자가 기대값과 같다', 차례.join(', '), expected.탭글자);
    const 선택됨 = await verify('「홈」 탭이 선택돼 있다', await driver.$(홈.탭.홈).getAttribute('selected'), 'true');
    await verify('홈 화면 하단 탭에 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」이 보이고 「홈」이 선택돼 있다', 탭들 && 선택됨, true);
  });
});
