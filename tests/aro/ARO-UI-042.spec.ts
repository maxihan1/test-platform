import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-042',
  name: '머리줄 「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」와 「취소」 · 「확인」 버튼이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('운영자 계정으로 로그인하고 대시보드를 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    await verify('머리줄에 운영자 이름이 보인다', await 대시보드.틀.운영자.isVisible(), true, { blocker: true });
  });

  await test.step('머리줄 「로그아웃」을 누른다', async () => {
    await 대시보드.틀.로그아웃누르기();
    const 열림 = await 대시보드.창.열릴때까지();
    const 문구 = await verify('확인 창에 「로그아웃 하시겠습니까?」가 보인다', 열림 ? (await 대시보드.창.본문.innerText()).trim() : '', '로그아웃 하시겠습니까?');
    const 취소 = await verify('확인 창에 「취소」 버튼이 보인다', await 대시보드.창.버튼('취소').isVisible(), true);
    const 확인 = await verify('확인 창에 「확인」 버튼이 보인다', await 대시보드.창.버튼('확인').isVisible(), true);
    await verify('머리줄 「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」와 「취소」 · 「확인」 버튼이 보인다', 문구 && 취소 && 확인, true);
  });
});
