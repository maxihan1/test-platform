import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄, 글읽기 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-417',
  name: '필터 목록에 필터 줄과 「활성 사용자」 상태, 「필터 추가」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    상태글: z.string().describe('필터 줄의 상태 글').default('활성 사용자'),
    추가글: z.string().describe('필터 추가 단추 글').default('필터 추가'),
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
    const 줄 = await verify('필터 목록에 필터 줄이 보인다', await 뜰때까지(driver, 필터.제목줄들, 10_000), true);
    const 상태 = await verify('필터 목록에 「활성 사용자」 상태가 보인다', await 뜰때까지(driver, 필터.줄(expected.상태글), 10_000), true);
    const 추가 = await verify('필터 목록에 「필터 추가」가 보인다', await 글읽기(driver, 필터.추가버튼), expected.추가글);
    await verify('필터 목록에 필터 줄과 「활성 사용자」 상태, 「필터 추가」가 보인다', 줄 && 상태 && 추가, true);
  });
});
