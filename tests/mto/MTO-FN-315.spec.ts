import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 서버규칙만들기, 서버규칙정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-315',
  name: '규칙이 2개면 첫 줄에는 「위로 이동」이 없고 마지막 줄에는 「아래로 이동」이 없다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 서버 규칙이 2개 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 규칙 = new 서버규칙화면(page);
  const 머리 = 고유이름('mto');
  const 첫글 = `${머리}-가`;
  const 끝글 = `${머리}-나`;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 서버 규칙 두 개를 만든다', async () => {
      await 서버규칙만들기(page, 첫글);
      await 서버규칙만들기(page, 끝글);
    });

    await test.step('케이스가 만든 서버 규칙이 2개 있는지 확인한다', async () => {
      await 규칙.열기();
      await verify('케이스가 만든 서버 규칙이 2개 있다', await 규칙.규칙줄(머리).count(), 2, { blocker: true });
    });

    await test.step('「서버 규칙」 화면을 연다', async () => {
      await 규칙.열기();
      const 위 = await verify('첫 줄에는 「위로 이동」이 없다', await 규칙.위로이동(첫글).isVisible(), false);
      const 아래 = await verify('마지막 줄에는 「아래로 이동」이 없다', await 규칙.아래로이동(끝글).isVisible(), false);
      await verify('규칙이 2개면 첫 줄에는 「위로 이동」이 없고 마지막 줄에는 「아래로 이동」이 없다', 위 && 아래, true);
    });
  } finally {
    await 서버규칙정리(page, 머리);
  }
});
