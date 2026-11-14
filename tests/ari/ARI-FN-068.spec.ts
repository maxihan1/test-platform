import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 게임로그인, 계정번호찾기, 고유이름, 제재걸기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-068',
  name: '정지된 「두 번째 플레이어」로 POST /api/login 을 부르면 403 과 code SUSPENDED · 제재 사유 · until null 이 돌아온다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 제재를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
  });
  await test.step('정지를 건 「두 번째 플레이어」 아이디와 비밀번호로 POST /api/login 을 부른다', async () => {
    try {
      const 사유 = 고유이름('ARI-FN-068 정지');
      const 걸기 = await 제재걸기(admin, 계정번호, { type: 'SUSPEND', reason: 사유 });
      await verify('「두 번째 플레이어」에 정지가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 응답 = await 게임로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string; until?: string | null };
      const 코드 = await verify('정지된 계정의 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('응답 code 가 SUSPENDED 다', 몸.code ?? '', 'SUSPENDED');
      const 문구 = await verify('응답 message 가 건 제재 사유와 같다', 몸.message ?? '', 사유);
      const 끝 = await verify('끝 없는 정지라 응답 until 이 null 이다', 몸.until === null, true);
      await verify('정지된 「두 번째 플레이어」로 POST /api/login 을 부르면 403 과 code SUSPENDED · 제재 사유 · until null 이 돌아온다', 코드 && 종류 && 문구 && 끝, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
    }
  });
});
