import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-483',
  name: '추천이 빈 계정의 「추천」 탭에 「Showcase your favorite accounts」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('blankId', 'blankPassword'),
  precondition: ['빈 계정으로 로그인해 있다'],
  params: z.object({
    blankId: z.string().describe('빈 계정 아이디').optional().meta({ secret: true, account: '빈 계정' }),
    blankPassword: z.string().describe('빈 계정 비밀번호').optional().meta({ secret: true, account: '빈 계정' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('빈 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.blankId, params.blankPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('빈 계정의 프로필 「추천」 탭을 연다', async () => {
    await driver.$(홈.탭.프로필).click();
    await verify('빈 계정 프로필 화면이 열린다', await 프로필.그려질때까지(), true, { blocker: true });
    await driver.$(프로필.탭('추천')).click();
    await verify('추천이 빈 계정의 「추천」 탭에 「Showcase your favorite accounts」가 보인다', await 뜰때까지(driver, 프로필.굴려서글자포함('Showcase your favorite accounts'), 15_000), true);
  });
});
