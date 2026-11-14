import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-397',
  name: '이름이 빈 아이템 줄이 있어도 보내면 이름이 있는 줄만 요청에 들어간다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-397');
  const 제목 = 고유글('ARO-FN-397');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      await 화면.열기();
      await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    });

    await test.step('이름이 빈 아이템 줄을 하나 남긴 채 지급을 보낸다', async () => {
      await 화면.폼채우기({
        캐릭터: 'qa_player2',
        아이템: [
          { 이름: '체력 물약', 수량: 1 },
          { 이름: '', 수량: 1 },
        ],
        제목,
        사유: 제목,
      });
      await 화면.보내기눌러확인창뜰때까지();
      const 요청 = 화면.지급요청본문기다리기();
      await 화면.확인창에서보내기();
      const 본문 = await 요청;
      await verify('이름이 빈 아이템 줄이 있어도 보내면 이름이 있는 줄만 요청에 들어간다', 본문.items.map((줄) => 줄.itemName).join(', '), '체력 물약');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
