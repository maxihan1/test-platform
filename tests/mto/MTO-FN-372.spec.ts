import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 그림만들기, 에모지정리, 에모지코드 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지추가화면 } from './pages/custom-emoji-new.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-372',
  name: '256KB PNG 로 올리면 에모지가 만들어진다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    경계바이트: z.number().int().min(1000).max(262144).describe('PNG 크기(바이트) — 256KB(262144바이트) 이하').default(262144),
    초과바이트: z.number().int().min(262145).describe('PNG 크기(바이트) — 256KB를 넘는 값').default(262145),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);
  const 추가 = new 커스텀에모지추가화면(page);
  const 안코드 = 에모지코드(10);
  const 밖코드 = 에모지코드(10);

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('256KB PNG 로 에모지를 올린다', async () => {
      await 추가.올리기(안코드, 그림만들기(params.경계바이트));
      const 만들어졌다 = await 목록.알림.글('에모지가 성공적으로 생성되었습니다!').waitFor({ timeout: 15_000 }).then(() => true, () => false);
      await verify('256KB PNG 로 올리면 에모지가 만들어진다', 만들어졌다, true);
    });

    await test.step('256KB 를 넘는 PNG 로 에모지를 올린다', async () => {
      await 추가.올리기(밖코드, 그림만들기(params.초과바이트));
      await 추가.오류안내.first().waitFor({ timeout: 15_000 });
      await 목록.열기();
      await verify('256KB 를 넘는 PNG 에모지는 만들어지지 않는다', await 목록.에모지줄(밖코드).count(), 0);
    });
  } finally {
    await 에모지정리(page, 안코드, 밖코드);
  }
});
