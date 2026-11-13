import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-UI-199',
  name: '「점검 켜기」를 켜고 「저장」을 누르면 확인 창 「점검을 켜면 허용 계정 말고는 게임에 로그인할 수 없습니다. 켤까요?」와 「점검 켜기」 · 「닫기」가 보인다',
  precondition: ['점검이 꺼져 있다'],
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

    await test.step('「점검 켜기」를 켜고 「저장」을 누른다', async () => {
      await 점검.켜기고르기(true);
      await 점검.저장누르기();
      const 열림 = await 점검.창.열릴때까지();
      const 문구 = await verify('확인 창에 「점검을 켜면 허용 계정 말고는 게임에 로그인할 수 없습니다. 켤까요?」가 보인다', 열림 ? (await 점검.창.본문.innerText()).trim() : '', '점검을 켜면 허용 계정 말고는 게임에 로그인할 수 없습니다. 켤까요?');
      const 켜기 = await verify('확인 창에 「점검 켜기」 버튼이 보인다', await 점검.창.버튼('점검 켜기').isVisible(), true);
      const 닫기 = await verify('확인 창에 「닫기」 버튼이 보인다', await 점검.창.버튼('닫기').isVisible(), true);
      await verify('「점검 켜기」를 켜고 「저장」을 누르면 확인 창 「점검을 켜면 허용 계정 말고는 게임에 로그인할 수 없습니다. 켤까요?」와 「점검 켜기」 · 「닫기」가 보인다', 문구 && 켜기 && 닫기, true);
      if (열림) await 점검.창.누르기('닫기');
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
