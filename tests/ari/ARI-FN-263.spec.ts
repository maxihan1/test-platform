import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 계정번호찾기, 시각, 점검되돌리기, 점검설정, 점검설정바꾸기, 점검설정읽기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-263',
  name: '점검 허용 목록에 든 「일반 회원」으로 POST /api/login 을 부르면 200 이다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 원래점검: 점검설정 | null = null;
  let 계정번호 = 0;
  await test.step('「일반 회원」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.playerId ?? '');
    await verify('「일반 회원」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  await test.step('「일반 회원」을 허용 목록에 넣고 점검을 켠 뒤 「일반 회원」으로 POST /api/login 을 부른다', async () => {
    try {
      원래점검 = await 점검설정읽기(admin);
      const 켜기 = await 점검설정바꾸기(admin, { enabled: true, message: '[QA] ARI-FN-263 점검 시험', startsAt: null, endsAt: 시각(10), allowedAccountIds: [계정번호] });
      await verify('점검이 켜졌다', 켜기.status(), 200, { blocker: true });
      const 응답 = await 게임로그인(request, params.playerId ?? '', params.playerPassword ?? '');
      await verify('점검 허용 목록에 든 「일반 회원」으로 POST /api/login 을 부르면 200 이다', 응답.status(), expected.응답코드);
    } finally {
      if (원래점검 !== null) await 점검되돌리기(admin, 원래점검);
    }
  });
});
