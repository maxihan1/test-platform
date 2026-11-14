import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-417',
  name: '필터 목록에 필터 줄(상태 「활성 사용자」 · 「비활성 사용자」)과 「필터 추가」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 필터목록 = new 필터목록화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  await test.step('계정 설정에서 「필터」를 누른다', async () => {
    await 계정설정.줄누르기('필터');
    const 추가 = await verify('「필터 추가」가 보인다', await 필터목록.떴나(), true);
    const 줄 = await verify('필터 줄이 한 줄 이상 보인다', (await 필터목록.제목글들()).length > 0, true);
    const 활성 = await verify('필터 상태 「활성 사용자」가 보인다', (await 필터목록.부제글들()).includes('활성 사용자'), true);
    await verify('필터 목록에 필터 줄(상태 「활성 사용자」 · 「비활성 사용자」)과 「필터 추가」가 보인다', 추가 && 줄 && 활성, true);
  }, { capture: true });
});
