import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 캐릭터번호 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-420',
  name: '골드 1,000,001 을 API 로 보내면 「재화는 0~1,000,000 입니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    넘는골드: z.number().int().min(1_000_001).max(99_999_999).describe('API 로 보낼 골드 — 1,000,001~99,999,999').default(1_000_001),
    모자란골드: z.number().int().min(-99_999_999).max(-1).describe('API 로 보낼 골드 — -99,999,999~-1').default(-1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-420');
  const 제목 = 고유글('ARO-FN-420');
  let 캐릭터 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, 'qa_player2');
    });

    await test.step('API 로 골드 1,000,001 인 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { currencyAmount: params.넘는골드 });
      await verify('골드 1,000,001 을 API 로 보내면 「재화는 0~1,000,000 입니다」가 온다', String(응답.body.message), '재화는 0~1,000,000 입니다');
    });

    await test.step('API 로 골드 -1 인 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { currencyAmount: params.모자란골드 });
      await verify('골드 -1 도 「재화는 0~1,000,000 입니다」로 거절된다', String(응답.body.message), '재화는 0~1,000,000 입니다');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
