import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 경고프리셋화면 } from './pages/warning-presets.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-501',
  name: '경고 프리셋이 없을 때 화면을 열면 「아직 어떤 경고 틀도 정의되지 않았습니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '경고 프리셋이 하나도 없다'],
  techniques: ['경계값 분석'],
  held: '보류 — 경고 프리셋이 0개인 상태',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프리셋 = new 경고프리셋화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('경고 프리셋이 하나도 없는지 확인한다', async () => {
    await 프리셋.열기();
    await verify('경고 프리셋이 하나도 없다', await 프리셋.프리셋줄들.count(), 0, { blocker: true });
  });

  await test.step('「경고 프리셋」 화면을 연다', async () => {
    await 프리셋.열기();
    await verify('경고 프리셋이 없을 때 화면을 열면 「아직 어떤 경고 틀도 정의되지 않았습니다.」가 보인다', await 프리셋.빈목록.isVisible(), true);
  });
});
