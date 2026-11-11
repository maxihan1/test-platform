import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 도메인감사기록열기, 도메인차단지우기, 도메인차단만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-265',
  name: '서버 상세에서 「감사 기록 전체 보기」를 누르면 그 도메인 기록만 든 감사 로그가 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 감사 = new 감사로그화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  const 도메인 = `${고유이름('mto')}.example.com`;
  try {
    await test.step('케이스가 차단할 도메인을 차단한다', async () => {
      await 도메인차단만들기(page, 도메인);
    });
    await test.step('차단한 도메인이 있는지 확인한다', async () => {
      await verify('케이스가 차단한 도메인이 있다', await 관리.알림.글('도메인 차단 처리를 완료했습니다').waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('그 서버 상세에서 「감사 기록 전체 보기」를 누른다', async () => {
      await 도메인감사기록열기(page, 도메인);
      await 감사.그려질때까지();
      const 있음 = await verify('그 도메인 기록이 보인다', (await 감사.로그줄.count()) > 0, true);
      const 다른기록 = await verify('그 도메인이 아닌 기록이 한 건도 보이지 않는다', await 감사.글이없는줄(도메인).count(), 0);
      await verify('서버 상세에서 「감사 기록 전체 보기」를 누르면 그 도메인 기록만 든 감사 로그가 열린다', 있음 && 다른기록, true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
