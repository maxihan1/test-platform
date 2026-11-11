import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 그림만들기, 에모지올리기, 에모지정리, 에모지코드 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지추가화면 } from './pages/custom-emoji-new.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-370',
  name: '같은 「짧은 코드」로 다시 올리면 에모지가 만들어지지 않고 오류가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 올린 에모지가 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);
  const 추가 = new 커스텀에모지추가화면(page);
  const 코드 = 에모지코드(10);

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 에모지를 올린다', async () => {
      await 에모지올리기(page, 코드);
    });

    await test.step('케이스가 올린 에모지가 있는지 확인한다', async () => {
      await verify('케이스가 올린 에모지가 있다', await 목록.에모지줄(코드).count(), 1, { blocker: true });
    });

    await test.step('같은 「짧은 코드」로 PNG 를 다시 올린다', async () => {
      await 추가.올리기(코드, 그림만들기());
      const 오류 = await 추가.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await 목록.열기();
      const 하나뿐 = await verify('에모지가 만들어지지 않는다', await 목록.에모지줄(코드).count(), 1);
      const 안내 = await verify('오류가 보인다', 오류, true);
      await verify('같은 「짧은 코드」로 다시 올리면 에모지가 만들어지지 않고 오류가 보인다', 하나뿐 && 안내, true);
    });
  } finally {
    await 에모지정리(page, 코드);
  }
});
