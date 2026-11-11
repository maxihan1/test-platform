import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 역할만들기, 역할정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 관리화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-345',
  name: '역할을 만들고 지운 뒤 「감사 로그」를 열면 그 역할을 만든 줄과 지운 줄이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 감사 = new 감사로그화면(page);
  const 이름 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('역할을 만들고 지운 뒤 「감사 로그」 화면을 연다', async () => {
      await 역할만들기(page, 이름, 5, ['대시보드 보기']);
      await 역할정리(page, 이름);
      await 감사.열기();
      const 만든줄 = await verify('그 역할을 만든 줄이 보인다', await 감사.로그줄.filter({ hasText: `${이름} 역할을 생성했습니다` }).count(), 1);
      const 지운줄 = await verify('그 역할을 지운 줄이 보인다', await 감사.로그줄.filter({ hasText: `${이름} 역할을 삭제했습니다` }).count(), 1);
      await verify('역할을 만들고 지운 뒤 「감사 로그」를 열면 그 역할을 만든 줄과 지운 줄이 보인다', 만든줄 && 지운줄, true);
    });
  } finally {
    await 역할정리(page, 이름);
  }
});
