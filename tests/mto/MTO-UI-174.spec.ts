import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단지우기, 시험도메인, 정지도메인차단만들기 } from './helpers/report-data.helper.js';
import { 서버상세화면 } from './pages/instance-detail.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-174',
  name: '「정지」로 차단한 도메인의 서버 상세에 「퍼지」가 보인다',
  precondition: ['케이스가 「정지」로 차단한 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 상세 = new 서버상세화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 「정지」로 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 정지도메인차단만들기(page, 도메인);
      await 연합.열기();
      await verify('케이스가 「정지」로 차단한 도메인이 있다', await 연합.줄정책(도메인, '정지').isVisible(), true, { blocker: true });
    });

    await test.step('그 서버 상세를 연다', async () => {
      await 상세.열기(도메인);
      await verify('「정지」로 차단한 도메인의 서버 상세에 「퍼지」가 보인다', await 상세.퍼지.isVisible(), true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
