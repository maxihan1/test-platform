import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 에모지목록 } from './helpers/api.helper.js';
import { 에모지올리기, 에모지정리, 에모지코드 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-379',
  name: '에모지를 「목록에서 제거」하면 공개 에모지 목록 API 에서 그 에모지가 선택기에 안 보이는 값으로 나온다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 올린 에모지가 있다'],
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

    await test.step('「로컬」에서 그 에모지를 골라 「목록에서 제거」를 누른다', async () => {
      await 목록.로컬열기();
      await 목록.선택해서누르기(코드, 목록.목록에서제거);
      await 목록.목록에없음표시(코드).waitFor({ timeout: 10_000 });
      const 에모지 = (await 에모지목록(page)).find((값) => 값.shortcode === 코드);
      await verify('에모지를 「목록에서 제거」하면 공개 에모지 목록 API 에서 그 에모지가 선택기에 안 보이는 값으로 나온다', 에모지?.visible_in_picker, false);
    });
  } finally {
    await 에모지정리(page, 코드);
  }
});
