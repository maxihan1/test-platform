import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시각, 점검되돌리기, 점검설정, 점검설정바꾸기, 점검설정읽기 } from './helpers/api.helper.js';
import { 이동경로 } from './helpers/html.helper.js';
import { 웹로그인 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-318',
  name: '점검 중 「두 번째 플레이어」로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 원래점검: 점검설정 | null = null;
  await test.step('점검을 켠 채 「두 번째 플레이어」로 POST /Account/Login 을 보낸다', async () => {
    try {
      원래점검 = await 점검설정읽기(admin);
      const 켜기 = await 점검설정바꾸기(admin, { enabled: true, message: '[QA] ARI-FN-318 점검 시험', startsAt: null, endsAt: 시각(10), allowedAccountIds: [] });
      await verify('점검이 켜졌다', 켜기.status(), 200, { blocker: true });
      const 응답 = await 웹로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 코드 = await verify('점검 중 웹 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
      await verify('점검 중 「두 번째 플레이어」로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다', 코드 && 주소, true);
    } finally {
      if (원래점검 !== null) await 점검되돌리기(admin, 원래점검);
    }
  });
});
