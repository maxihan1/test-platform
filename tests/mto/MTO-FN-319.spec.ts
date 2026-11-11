import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 서버규칙만들기, 서버규칙정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-319',
  name: '첫 규칙의 「아래로 이동」을 누르면 두 규칙의 순서가 바뀐다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 서버 규칙이 2개 있다', '케이스가 만든 서버 규칙이 있다'],
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

    await test.step('첫 규칙의 「아래로 이동」을 누른다', async () => {
      await 규칙.아래로이동(첫글).click();
      await 규칙.첫줄이될때까지(머리, 끝글);
      await verify('첫 규칙의 「아래로 이동」을 누르면 두 규칙의 순서가 바뀐다', (await 규칙.줄글들(머리)).join(', '), `1. ${끝글}, 2. ${첫글}`);
    });

    await test.step('케이스가 만든 서버 규칙이 있는지 확인한다', async () => {
      await verify('케이스가 만든 서버 규칙이 있다', (await 규칙.규칙줄(머리).count()) > 0, true, { blocker: true });
    });

    await test.step('그 규칙의 「삭제」를 누르고 확인 창에서 확인한다', async () => {
      const 창 = 확인창받기(page, '확인');
      await 규칙.삭제링크(첫글).click();
      await 창;
      const 사라졌다 = await 규칙.규칙줄(첫글).first().waitFor({ state: 'detached', timeout: 10_000 }).then(() => true, () => false);
      await verify('「삭제」한 서버 규칙은 목록에서 사라진다', 사라졌다, true);
    });
  } finally {
    await 서버규칙정리(page, 머리);
  }
});
