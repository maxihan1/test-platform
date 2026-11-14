import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-154',
  name: '새 지급 줄의 「회수」를 누르면 「지급 #<번호> 회수」 창이 열린다',
  precondition: ['qa_player2 에게 보낸 안 받은 지급이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-UI-154');
  const 제목 = 고유글('ARO-UI-154');
  let 번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 qa_player2 에게 지급을 보내 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      번호 = await 새지급(page, 지급내용만들기(await 캐릭터번호(page, 'qa_player2'), 제목, 제목));
    });

    await test.step('「지급 · 회수」 화면에서 보낸 지급 줄을 확인한다', async () => {
      await 화면.열기();
      await 화면.행(제목).waitFor();
      await verify('qa_player2 에게 보낸 안 받은 지급이 있다', await 화면.회수버튼(제목).isVisible(), true, { blocker: true });
    });

    await test.step('그 지급 줄의 「회수」를 누른다', async () => {
      await 화면.회수창열기(제목);
      await verify('새 지급 줄의 「회수」를 누르면 「지급 #<번호> 회수」 창이 열린다', await 화면.창.제목.innerText(), `지급 #${String(번호)} 회수`);
    });

    await test.step('회수 창의 칸과 버튼을 본다', async () => {
      const 칸 = await verify('「회수 사유 (1~200자)」 칸이 보인다', await 화면.창.칸('회수 사유 (1~200자)').isVisible(), true);
      const 닫기 = await verify('「닫기」 버튼이 보인다', await 화면.창.버튼('닫기').isVisible(), true);
      const 회수 = await verify('「회수」 버튼이 보인다', await 화면.창.버튼('회수').isVisible(), true);
      await verify('회수 창에 「회수 사유 (1~200자)」 칸과 「닫기」 · 「회수」 버튼이 보인다', 칸 && 닫기 && 회수, true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
