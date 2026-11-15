import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-421',
  name: '필터 범위에 「홈 & 리스트」 · 「알림」 · 「공개 타임라인」 · 「스레드 & 답글」 · 「프로필」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    범위1: z.string().describe('필터 범위 선택지').default('홈 & 리스트'),
    범위2: z.string().describe('필터 범위 선택지').default('알림'),
    범위3: z.string().describe('필터 범위 선택지').default('공개 타임라인'),
    범위4: z.string().describe('필터 범위 선택지').default('스레드 & 답글'),
    범위5: z.string().describe('필터 범위 선택지').default('프로필'),
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
  await test.step('필터 추가 화면에서 범위를 고른다', async () => {
    await 필터.줄누르기('를 뮤트');
    const 보임1 = await verify('필터 범위에 「홈 & 리스트」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.범위1), 10_000), true);
    const 보임2 = await verify('필터 범위에 「알림」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.범위2), 10_000), true);
    const 보임3 = await verify('필터 범위에 「공개 타임라인」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.범위3), 10_000), true);
    const 보임4 = await verify('필터 범위에 「스레드 & 답글」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.범위4), 10_000), true);
    const 보임5 = await verify('필터 범위에 「프로필」가 보인다', await 뜰때까지(driver, 필터.화면글정확히(expected.범위5), 10_000), true);
    await verify('필터 범위에 「홈 & 리스트」 · 「알림」 · 「공개 타임라인」 · 「스레드 & 답글」 · 「프로필」이 보인다', 보임1 && 보임2 && 보임3 && 보임4 && 보임5, true);
  });
});
