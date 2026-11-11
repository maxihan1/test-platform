import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 에모지올리기, 에모지정리, 에모지코드 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-373',
  name: '케이스 에모지를 골라 「비활성화」를 누르면 「비활성화했습니다」로 끝나는 알림이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 올린 에모지가 있다', '케이스가 올려 비활성화한 에모지가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);
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

    await test.step('그 에모지를 골라 「비활성화」를 누른다', async () => {
      await 목록.선택해서누르기(코드, 목록.비활성화);
      const 보인다 = await 목록.끝나는알림('비활성화했습니다').first().waitFor({ timeout: 3_000 }).then(() => true, () => false);
      await verify('케이스 에모지를 골라 「비활성화」를 누르면 「비활성화했습니다」로 끝나는 알림이 보인다', 보인다, true);
    });

    await test.step('케이스가 올려 비활성화한 에모지가 있는지 확인한다', async () => {
      const 비활성 = await 목록.비활성표시(코드).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('케이스가 올려 비활성화한 에모지가 있다', 비활성, true, { blocker: true });
    });

    await test.step('그 에모지를 골라 「활성화」를 누른다', async () => {
      await 목록.선택해서누르기(코드, 목록.활성화);
      const 보인다 = await 목록.알림.글('성공적으로 에모지를 활성화하였습니다').waitFor({ timeout: 3_000 }).then(() => true, () => false);
      await verify('「활성화」 뒤에는 「성공적으로 에모지를 활성화하였습니다」가 보인다', 보인다, true);
    });
  } finally {
    await 에모지정리(page, 코드);
  }
});
