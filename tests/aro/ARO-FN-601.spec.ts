import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-601',
  name: '스위치는 그대로 두고 안내 문구만 바꿔 저장하면 확인 창 없이 저장된다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 점검 = new 점검화면(page);
  let 앞: 점검상태 | undefined;

  try {
    await test.step('운영자 계정으로 로그인하고 점검을 꺼 둔 채 「점검」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      await 점검.열기();
      await 점검.틀.그려질때까지();
      await verify('「점검」 화면에 「저장」 버튼이 보인다', await 점검.저장버튼.isVisible(), true, { blocker: true });
      await verify('점검이 꺼져 있다', (await 점검읽기(page)).enabled, false, { blocker: true });
    });

    await test.step('스위치는 그대로 두고 안내 문구만 바꿔 「저장」을 누른다', async () => {
      await 점검.안내적기('[QA] ARO-FN-601 ' + String(Date.now()));
      await 점검.저장누르기();
      const 저장 = await verify('점검 설정이 저장된다', await 점검.알림.뜰때까지('점검 설정을 저장했습니다'), true);
      const 창없음 = await verify('확인 창이 뜨지 않는다', await 점검.창.상자.isVisible(), false);
      await verify('스위치는 그대로 두고 안내 문구만 바꿔 저장하면 확인 창 없이 저장된다', 저장 && 창없음, true);
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
