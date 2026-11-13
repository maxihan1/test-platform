import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 게임로그인, 계정번호찾기, 고유이름, 시각, 점검되돌리기, 점검설정, 점검설정바꾸기, 점검설정읽기, 제재걸기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-493',
  name: '정지된 「두 번째 플레이어」로 POST /api/login 을 부르면 403 응답에도 Set-Cookie 헤더가 붙는다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다', '대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ request, admin, params }) => {
  const 점검문구 = '[QA] ARI-FN-493 점검 시험';
  let 원래점검: 점검설정 | null = null;
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 제재를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
  });
  await test.step('정지를 건 「두 번째 플레이어」로 POST /api/login 을 부른다', async () => {
    try {
      const 사유 = 고유이름('ARI-FN-493 정지');
      const 걸기 = await 제재걸기(admin, 계정번호, { type: 'SUSPEND', reason: 사유 });
      await verify('「두 번째 플레이어」에 정지가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 응답 = await 게임로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 코드 = await verify('정지된 계정의 로그인 응답 코드가 403 이다', 응답.status(), 403);
      const 쿠키 = await verify('403 응답에 Set-Cookie 헤더가 있다', (응답.headers()['set-cookie'] ?? '') !== '', true);
      await verify('정지된 「두 번째 플레이어」로 POST /api/login 을 부르면 403 응답에도 Set-Cookie 헤더가 붙는다', 코드 && 쿠키, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
    }
  });
  await test.step('점검을 켠 채 「두 번째 플레이어」로 POST /api/login 을 부른다', async () => {
    try {
      원래점검 = await 점검설정읽기(admin);
      const 켜기 = await 점검설정바꾸기(admin, { enabled: true, message: 점검문구, startsAt: null, endsAt: 시각(10), allowedAccountIds: [] });
      await verify('점검이 켜졌다', 켜기.status(), 200, { blocker: true });
      const 응답 = await 게임로그인(request, params.player2Id ?? '', params.player2Password ?? '');
      const 코드 = await verify('점검 중 로그인 응답 코드가 503 이다', 응답.status(), 503);
      const 쿠키 = await verify('503 응답에 Set-Cookie 헤더가 있다', (응답.headers()['set-cookie'] ?? '') !== '', true);
      await verify('점검 중 503 응답에도 Set-Cookie 헤더가 붙는다', 코드 && 쿠키, true);
    } finally {
      if (원래점검 !== null) await 점검되돌리기(admin, 원래점검);
    }
  });
});
