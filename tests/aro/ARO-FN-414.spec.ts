import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 글자, 캐릭터번호 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-414',
  name: '공백 이름 아이템을 API 로 보내면 「아이템 이름을 입력하세요」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    넘는이름길이: z.number().int().min(101).max(300).describe('API 로 보낼 아이템 이름 글자 수 — 101~300').default(101),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-414');
  const 제목 = 고유글('ARO-FN-414');
  let 캐릭터 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, 'qa_player2');
    });

    await test.step('API 로 아이템 이름이 공백인 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { items: [{ itemName: '   ', quantity: 1 }] });
      await verify('공백 이름 아이템을 API 로 보내면 「아이템 이름을 입력하세요」가 온다', String(응답.body.message), '아이템 이름을 입력하세요');
    });

    await test.step('API 로 아이템 이름이 101자인 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { items: [{ itemName: 글자(params.넘는이름길이), quantity: 1 }] });
      await verify('101자 아이템 이름도 「아이템 이름을 입력하세요」로 거절된다', String(응답.body.message), '아이템 이름을 입력하세요');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
