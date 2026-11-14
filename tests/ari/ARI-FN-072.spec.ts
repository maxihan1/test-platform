import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 게임로그인, 계정번호찾기, 시각, 점검되돌리기, 점검설정, 점검설정바꾸기, 점검설정읽기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-072',
  name: '점검 중 허용 목록에 없는 「두 번째 플레이어」로 POST /api/login 을 부르면 503 과 code MAINTENANCE · 점검 문구가 돌아온다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(503),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 점검문구 = '[QA] ARI-FN-072 점검 시험';
  let 원래점검: 점검설정 | null = null;
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 제재를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
  });
  await test.step('점검을 켠 채 「두 번째 플레이어」 아이디와 비밀번호로 POST /api/login 을 부른다', async () => {
    try {
      원래점검 = await 점검설정읽기(admin);
      const 켜기 = await 점검설정바꾸기(admin, { enabled: true, message: 점검문구, startsAt: null, endsAt: 시각(10), allowedAccountIds: [] });
      await verify('점검이 켜졌다', 켜기.status(), 200, { blocker: true });
      const 응답 = await 게임로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 코드 = await verify('점검 중 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('응답 code 가 MAINTENANCE 다', 몸.code ?? '', 'MAINTENANCE');
      const 문구 = await verify('응답 message 가 넣은 점검 문구와 같다', 몸.message ?? '', 점검문구);
      await verify('점검 중 허용 목록에 없는 「두 번째 플레이어」로 POST /api/login 을 부르면 503 과 code MAINTENANCE · 점검 문구가 돌아온다', 코드 && 종류 && 문구, true);
    } finally {
      if (원래점검 !== null) await 점검되돌리기(admin, 원래점검);
    }
  });
});
