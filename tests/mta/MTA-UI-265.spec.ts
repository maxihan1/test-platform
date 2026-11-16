import { defineCase, test, verify } from '@platform/kit';
import { 글자들 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-265',
  name: '알림 제외 조건 창에 「내가 팔로우하지 않는 사람들」 · 「나를 팔로우하지 않는 사람들」 · 「새로운 계정」 · 「요청하지 않은 개인 멘션」과 부제 · 「저장」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    항목들: z.string().describe('창 항목 제목 차례').default('내가 팔로우하지 않는 사람들, 나를 팔로우하지 않는 사람들, 새로운 계정, 요청하지 않은 개인 멘션'),
    부제수: z.number().int().describe('창 항목 부제 개수').default(4),
    저장: z.string().describe('저장 버튼 글자').default('저장'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('알림 화면에서 「알림 제외 조건...」을 누른다', async () => {
    await verify('알림 제외 조건 창이 열린다', await 알림.정책창열기(), true, { blocker: true });
    const 항목 = await verify('창 항목 제목이 기대값과 같다', (await 글자들(driver, 알림.정책항목제목들)).join(', '), expected.항목들);
    const 부제 = await verify('창 항목 부제 개수가 기대값과 같다', (await 글자들(driver, 알림.정책항목부제들)).length, expected.부제수);
    const 저장 = await verify('저장 버튼 글자가 기대값과 같다', await driver.$(알림.정책저장).getText(), expected.저장);
    await verify('알림 제외 조건 창에 「내가 팔로우하지 않는 사람들」 · 「나를 팔로우하지 않는 사람들」 · 「새로운 계정」 · 「요청하지 않은 개인 멘션」과 부제 · 「저장」이 보인다', 항목 && 부제 && 저장, true);
  });
});
