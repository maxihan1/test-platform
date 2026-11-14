import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 캐릭터번호 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-417',
  name: '수량 0 을 API 로 보내면 「아이템 수량은 1~99 입니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    넘는수량: z.number().int().min(100).max(1000).describe('API 로 보낼 아이템 수량 — 100~1000').default(100),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-417');
  const 제목 = 고유글('ARO-FN-417');
  let 캐릭터 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, 'qa_player2');
    });

    await test.step('API 로 수량 0 인 아이템을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { items: [{ itemName: '체력 물약', quantity: 0 }] });
      await verify('수량 0 을 API 로 보내면 「아이템 수량은 1~99 입니다」가 온다', String(응답.body.message), '아이템 수량은 1~99 입니다');
    });

    await test.step('API 로 수량 100 인 아이템을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { items: [{ itemName: '체력 물약', quantity: params.넘는수량 }] });
      await verify('수량 100 도 「아이템 수량은 1~99 입니다」로 거절된다', String(응답.body.message), '아이템 수량은 1~99 입니다');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
