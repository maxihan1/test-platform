import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-594',
  name: '허용 계정에 「1, a」를 적고 저장하면 서버를 부르지 않고 토스트 「허용 계정에는 숫자 번호만 쉼표로 적으세요」가 뜬다',
  techniques: ['동등 분할'],
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

    await test.step('허용 계정에 「1, a」를 적고 「저장」을 누른다', async () => {
      await 점검.허용적기('1, a');
      await 점검.저장누르기();
      const 토스트 = await verify('토스트 「허용 계정에는 숫자 번호만 쉼표로 적으세요」가 뜬다', await 점검.알림.뜰때까지('허용 계정에는 숫자 번호만 쉼표로 적으세요'), true);
      const 안보냄 = await verify('점검 저장 요청이 서버로 가지 않는다', 점검.저장요청수, 0);
      await verify('허용 계정에 「1, a」를 적고 저장하면 서버를 부르지 않고 토스트 「허용 계정에는 숫자 번호만 쉼표로 적으세요」가 뜬다', 토스트 && 안보냄, true);
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
