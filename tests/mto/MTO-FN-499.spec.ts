import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 서버규칙만들기, 서버규칙정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-499',
  name: '서버 규칙이 없을 때 「서버 규칙」 화면을 열면 「아직 정의된 서버 규칙이 없습니다.」와 「규칙 추가」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '서버 규칙이 하나도 없다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 규칙 = new 서버규칙화면(page);
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('서버 규칙이 하나도 없는지 확인한다', async () => {
      await 규칙.열기();
      await verify('서버 규칙이 하나도 없다', await 규칙.규칙줄들.count(), 0, { blocker: true });
    });

    await test.step('「서버 규칙」 화면을 연다', async () => {
      await 규칙.열기();
      const 안내 = await verify('「아직 정의된 서버 규칙이 없습니다.」가 보인다', await 규칙.빈목록.isVisible(), true);
      const 추가 = await verify('「규칙 추가」가 보인다', await 규칙.규칙추가.isVisible(), true);
      await verify('서버 규칙이 없을 때 「서버 규칙」 화면을 열면 「아직 정의된 서버 규칙이 없습니다.」와 「규칙 추가」가 보인다', 안내 && 추가, true);
    });

    await test.step('규칙을 하나 더하고 「서버 규칙」 화면을 연다', async () => {
      await 서버규칙만들기(page, 글);
      await 규칙.열기();
      const 번호 = await verify('「1.」로 시작하는 규칙 줄이 보인다', ((await 규칙.줄글들(글))[0] ?? '').startsWith('1.'), true);
      const 빈안내 = await verify('빈 목록 안내는 보이지 않는다', await 규칙.빈목록.isVisible(), false);
      await verify('서버 규칙이 하나 있는 「서버 규칙」 화면에는 「1.」로 시작하는 규칙 줄이 보이고 빈 목록 안내는 보이지 않는다', 번호 && 빈안내, true);
    });
  } finally {
    await 서버규칙정리(page, 글);
  }
});
