import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유접두, 내것지급치우기, 로그인돼있는가, 이력채우기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급목록, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-252',
  name: '지급 이력에서 「다음」을 누르면 「2 / N」 쪽으로 간다',
  precondition: ['지급 이력이 21건 이상이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 쪽크기 = 20;

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-UI-252');

  try {
    await test.step('운영자 계정으로 로그인하고 지급 이력을 21건 이상으로 채운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      await 이력채우기(page, 21, await 캐릭터번호(page, 'qa_player2'), 접두);
      await verify('지급 이력이 21건 이상이다', (await 지급목록(page, 1, 1)).total >= 21, true, { blocker: true });
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      await 화면.열기();
      await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    });

    await test.step('지급 이력 표에서 「다음」을 누른다', async () => {
      await 화면.다음쪽으로();
      const 전체 = (await 지급목록(page, 1, 1)).total;
      await verify('지급 이력에서 「다음」을 누르면 「2 / N」 쪽으로 간다', await 화면.쪽번호(), `2 / ${String(Math.ceil(전체 / 쪽크기))}`);
    });

    await test.step('둘째 쪽에서 「이전」을 누른다', async () => {
      await 화면.이전쪽으로();
      const 전체 = (await 지급목록(page, 1, 1)).total;
      await verify('지급 이력 「이전」은 「1 / N」 쪽으로 돌아간다', await 화면.쪽번호(), `1 / ${String(Math.ceil(전체 / 쪽크기))}`);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
