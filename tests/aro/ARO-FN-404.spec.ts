import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기, 없는번호들 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-404',
  name: '받는 캐릭터 0명을 API 로 보내면 「받는 캐릭터를 1~50명 고르세요」가 온다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    큰명수: z.number().int().min(2).max(50).describe('API 로 보낼 없는 캐릭터 번호 수 — 2~50').default(50),
    넘는명수: z.number().int().min(51).max(200).describe('API 로 보낼 캐릭터 번호 수 — 51~200').default(51),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-404');
  const 제목 = 고유글('ARO-FN-404');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('API 로 받는 캐릭터 0명인 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [], 제목);
      await verify('받는 캐릭터 0명을 API 로 보내면 「받는 캐릭터를 1~50명 고르세요」가 온다', String(응답.body.message), '받는 캐릭터를 1~50명 고르세요');
    });

    await test.step('API 로 없는 캐릭터 번호 1명에게 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, 없는번호들(1), 제목);
      await verify('없는 번호 1명은 명수 검사를 넘어 「없는 캐릭터가 섞여 있습니다」가 온다', String(응답.body.message), '없는 캐릭터가 섞여 있습니다');
    });

    await test.step('API 로 없는 캐릭터 번호 50명에게 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, 없는번호들(params.큰명수), 제목);
      await verify('없는 번호 50명도 명수 검사를 넘어 「없는 캐릭터가 섞여 있습니다」가 온다', String(응답.body.message), '없는 캐릭터가 섞여 있습니다');
    });

    await test.step('API 로 캐릭터 번호 51명에게 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, 없는번호들(params.넘는명수), 제목);
      await verify('51명은 「받는 캐릭터를 1~50명 고르세요」로 거절된다', String(응답.body.message), '받는 캐릭터를 1~50명 고르세요');
    });

  } finally {
    await 내것지급치우기(page, 접두);
  }
});
