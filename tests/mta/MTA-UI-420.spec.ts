import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-420',
  name: '필터 「기간」을 누르면 「무기한」 · 「30분」 · 「1시간」 · 「12시간」 · 「1일」 · 「3일」 · 「1 주」 · 「사용자 지정」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    기간1: z.string().describe('필터 기간 선택지').default('무기한'),
    기간2: z.string().describe('필터 기간 선택지').default('30분'),
    기간3: z.string().describe('필터 기간 선택지').default('1시간'),
    기간4: z.string().describe('필터 기간 선택지').default('12시간'),
    기간5: z.string().describe('필터 기간 선택지').default('1일'),
    기간6: z.string().describe('필터 기간 선택지').default('3일'),
    기간7: z.string().describe('필터 기간 선택지').default('1 주'),
    기간8: z.string().describe('필터 기간 선택지').default('사용자 지정'),
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
  await test.step('필터 추가 화면에서 「기간」을 누른다', async () => {
    await 필터.줄누르기('기간');
    const 보임1 = await verify('필터 「기간」 선택지에 「무기한」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간1), 10_000), true);
    const 보임2 = await verify('필터 「기간」 선택지에 「30분」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간2), 10_000), true);
    const 보임3 = await verify('필터 「기간」 선택지에 「1시간」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간3), 10_000), true);
    const 보임4 = await verify('필터 「기간」 선택지에 「12시간」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간4), 10_000), true);
    const 보임5 = await verify('필터 「기간」 선택지에 「1일」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간5), 10_000), true);
    const 보임6 = await verify('필터 「기간」 선택지에 「3일」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간6), 10_000), true);
    const 보임7 = await verify('필터 「기간」 선택지에 「1 주」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간7), 10_000), true);
    const 보임8 = await verify('필터 「기간」 선택지에 「사용자 지정」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.기간8), 10_000), true);
    await verify('필터 「기간」을 누르면 「무기한」 · 「30분」 · 「1시간」 · 「12시간」 · 「1일」 · 「3일」 · 「1 주」 · 「사용자 지정」이 보인다', 보임1 && 보임2 && 보임3 && 보임4 && 보임5 && 보임6 && 보임7 && 보임8, true);
  });
});
