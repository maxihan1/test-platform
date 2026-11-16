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
  tcId: 'MTA-FN-497',
  name: '필터를 저장하지 않고 나가면 「변경 사항을 지우시겠습니까?」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    제목: z.string().min(1).describe('필터 제목 — 저장하지 않는다').default('qa임시필터'),
  }),
  expected: z.object({
    묻는글: z.string().describe('저장 없이 나갈 때 확인 글').default('변경 사항을 지우시겠습니까?'),
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
  await test.step('필터 추가 화면에서 제목을 적고 저장 없이 뒤로 간다', async () => {
    await 칸에적기(await driver.$(필터.제목칸).getElement(), params.제목);
    await driver.back();
    if (!(await 뜰때까지(driver, 필터.화면글(expected.묻는글), 3_000))) await driver.back();
    await verify('필터를 저장하지 않고 나가면 「변경 사항을 지우시겠습니까?」가 보인다', await 뜰때까지(driver, 필터.화면글(expected.묻는글), 10_000), true);
    await driver.back();
  });
});
