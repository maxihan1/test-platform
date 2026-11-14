import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 캐릭터번호 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-411',
  name: '아이템 6종을 API 로 보내면 「아이템은 한 번에 5종까지 보낼 수 있습니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-411');
  const 제목 = 고유글('ARO-FN-411');
  let 캐릭터 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, 'qa_player2');
    });

    await test.step('API 로 아이템 6종인 지급을 보낸다', async () => {
      const 아이템들 = ['체력 물약', '녹슨 단검', '강철 롱소드', '가죽 갑옷', '불꽃의 검', '임프의 뿔'].map((이름) => ({ itemName: 이름, quantity: 1 }));
      const 응답 = await 번호들로지급보내기(page, [캐릭터], 제목, { items: 아이템들 });
      await verify('아이템 6종을 API 로 보내면 「아이템은 한 번에 5종까지 보낼 수 있습니다」가 온다', String(응답.body.message), '아이템은 한 번에 5종까지 보낼 수 있습니다');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
