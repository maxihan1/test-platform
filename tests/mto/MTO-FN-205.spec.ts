import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';
import { 서버상세화면 } from './pages/instance-detail.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-205',
  name: '대문자가 섞인 도메인으로 차단하면 연합 목록에 소문자 도메인으로 보이고 줄을 누르면 그 서버 상세가 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 폼 = new 도메인차단폼화면(page);
  const 상세 = new 서버상세화면(page);
  const 도메인 = 시험도메인();
  const 섞인도메인 = 도메인.replace(/^mto/, 'MTO');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 연합.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
    });

    await test.step('대문자가 섞인 도메인으로 도메인 차단을 추가하고 「연합」 목록에서 그 줄을 누른다', async () => {
      await 폼.열기();
      await 폼.차단하기(섞인도메인, '제한');
      await 연합.알림.글('도메인 차단 처리를 완료했습니다').waitFor();
      const 소문자 = await verify('연합 목록에 소문자 도메인으로 보인다', await 연합.줄도메인글(도메인), 도메인);
      await 연합.줄(도메인).click();
      const 열림 = await verify('그 서버 상세가 열린다', await 상세.제목(도메인).waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      await verify('대문자가 섞인 도메인으로 차단하면 연합 목록에 소문자 도메인으로 보이고 줄을 누르면 그 서버 상세가 열린다', 소문자 && 열림, true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
