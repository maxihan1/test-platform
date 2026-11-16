import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-493',
  name: '「뮤트할 단어 추가」 창에서 「도움말」을 누르면 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」가 보이고 단어를 더하면 목록에 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    단어: z.string().min(1).describe('뮤트할 단어 — 공백 없는 짧은 글').default('qa단어'),
  }),
  expected: z.object({
    안내글: z.string().describe('뮤트할 단어 추가 창 안내').default('단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 필터 = new 필터화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('계정 설정에서 「필터」를 연다', async () => {
    await verify('필터 목록이 열린다', await 설정줄열기(driver, '필터'), true, { blocker: true });
  });
  await test.step('필터 목록에서 「필터 추가」를 누른다', async () => {
    await driver.$(필터.추가버튼).click();
    await verify('필터 추가 화면이 열린다', await 필터.편집그려질때까지(), true, { blocker: true });
  });
  await test.step('필터 추가 화면에서 「뮤트된 단어」를 연다', async () => {
    await 필터.줄누르기('뮤트된 단어');
    await verify('뮤트된 단어 화면이 열린다', await 뜰때까지(driver, 필터.단어추가목록버튼, 10_000), true, { blocker: true });
  });
  await test.step('필터 「뮤트된 단어」에서 「도움말」을 누르고 단어를 더한다', async () => {
    await driver.$(필터.단어추가목록버튼).click();
    await verify('「뮤트할 단어 추가」 창이 뜬다', await 뜰때까지(driver, 필터.단어칸, 10_000), true, { blocker: true });
    await driver.$(필터.단어도움말).click();
    const 안내 = await verify('「뮤트할 단어 추가」 창에 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」가 보인다', await 뜰때까지(driver, 필터.화면글(expected.안내글), 10_000), true);
    await 칸에적기(await driver.$(필터.단어칸).getElement(), params.단어);
    await driver.$(필터.단어추가버튼).click();
    const 목록 = await verify('더한 단어가 목록에 보인다', await 뜰때까지(driver, 필터.줄(params.단어), 10_000), true);
    await verify('「뮤트할 단어 추가」 창에서 「도움말」을 누르면 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」가 보이고 단어를 더하면 목록에 보인다', 안내 && 목록, true);
  });
});
