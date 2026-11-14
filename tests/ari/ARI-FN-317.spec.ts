import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 고유이름, 제재걸기 } from './helpers/api.helper.js';
import { 이동경로 } from './helpers/html.helper.js';
import { 웹로그인 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-317',
  name: '정지된 「두 번째 플레이어」로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다',
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
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 제재를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
  });
  await test.step('정지를 건 「두 번째 플레이어」로 POST /Account/Login 을 보낸다', async () => {
    try {
      const 걸기 = await 제재걸기(admin, 계정번호, { type: 'SUSPEND', reason: 고유이름('ARI-FN-317 정지') });
      await verify('「두 번째 플레이어」에 정지가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 응답 = await 웹로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 코드 = await verify('정지된 계정의 웹 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
      await verify('정지된 「두 번째 플레이어」로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다', 코드 && 주소, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
    }
  });
});
