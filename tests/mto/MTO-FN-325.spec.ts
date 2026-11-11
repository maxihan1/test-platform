import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 경고프리셋만들기, 경고프리셋정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 경고프리셋화면 } from './pages/warning-presets.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-325',
  name: '경고 프리셋을 만들면 조치 화면 「경고 틀 사용하기」에 그 제목이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 경고 프리셋이 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프리셋 = new 경고프리셋화면(page);
  const 상세 = new 계정상세화면(page);
  const 조치 = new 조치화면(page);
  const 제목 = 고유이름('mto');
  let 번호 = '';

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 경고 프리셋을 만들고 qa_user2 제재를 푼다', async () => {
      await 경고프리셋만들기(page, 제목, 'MTO 시험 경고 본문');
      await qa_user2되돌리기(page);
    });

    await test.step('케이스가 만든 경고 프리셋이 있는지 확인한다', async () => {
      await 프리셋.열기();
      await verify('케이스가 만든 경고 프리셋이 있다', await 프리셋.프리셋줄(제목).count(), 1, { blocker: true });
    });

    await test.step('조치 대상 qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', await 상세.동결.isVisible(), true, { blocker: true });
    });

    await test.step('qa_user2 의 조치 취하기 화면에서 「경고 틀 사용하기」를 연다', async () => {
      await 조치.열기(번호, 'none');
      await 조치.그려질때까지();
      await verify('경고 프리셋을 만들면 조치 화면 「경고 틀 사용하기」에 그 제목이 보인다', ((await 조치.경고틀.textContent()) ?? '').includes(제목), true);
    });
  } finally {
    await 경고프리셋정리(page, 제목);
  }
});
