import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 게임로그인, 계정번호찾기, 고유이름, 시각, 점검되돌리기, 점검설정, 점검설정바꾸기, 점검설정읽기, 제재걸기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-498',
  name: '정지와 점검이 같이 걸린 「두 번째 플레이어」로 POST /api/login 을 부르면 403 SUSPENDED 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ request, admin, params }) => {
  const 점검문구 = '[QA] ARI-FN-498 점검 시험';
  let 원래점검: 점검설정 | null = null;
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 제재를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
  });
  await test.step('정지와 점검을 같이 건 채 「두 번째 플레이어」로 POST /api/login 을 부른다', async () => {
    try {
      const 사유 = 고유이름('ARI-FN-498 정지');
      const 걸기 = await 제재걸기(admin, 계정번호, { type: 'SUSPEND', reason: 사유 });
      await verify('「두 번째 플레이어」에 정지가 걸렸다', 걸기.status(), 200, { blocker: true });
      원래점검 = await 점검설정읽기(admin);
      const 켜기 = await 점검설정바꾸기(admin, { enabled: true, message: 점검문구, startsAt: null, endsAt: 시각(10), allowedAccountIds: [] });
      await verify('점검이 켜졌다', 켜기.status(), 200, { blocker: true });
      const 응답 = await 게임로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('정지와 점검이 같이 걸린 로그인 응답 코드가 403 이다', 응답.status(), 403);
      const 종류 = await verify('응답 code 가 SUSPENDED 다', 몸.code ?? '', 'SUSPENDED');
      await verify('정지와 점검이 같이 걸린 「두 번째 플레이어」로 POST /api/login 을 부르면 403 SUSPENDED 다', 코드 && 종류, true);
    } finally {
      if (원래점검 !== null) await 점검되돌리기(admin, 원래점검);
      await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
    }
  });
});
