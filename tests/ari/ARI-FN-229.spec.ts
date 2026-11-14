import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급정리, 지급하고번호, 지급회수 } from './helpers/api.helper.js';
import { 서버토큰, 우편들지우기, 우편저장, 우편하나, 첨부바꾸기, 첨부번호글들 } from './helpers/data.helper.js';
import { 우편저장글읽기, 지급우편번호, 지급우편상태기다리기 } from './helpers/grant-mail.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-229',
  name: '일부를 가져간 우편을 회수하면 지급 기록의 우편 상태가 PARTLY_RECALLED 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    우편상태: z.string().describe('회수한 뒤 우편 상태').default('PARTLY_RECALLED'),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 캐릭터 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('아이템 둘을 지급하고 첨부 하나만 뺀 채 우편을 저장한 뒤 그 지급을 회수한다', async () => {
    let 지급번호 = 0;
    let 우편번호 = 0;
    let 회수됨 = false;
    try {
      지급번호 = await 지급하고번호(
        admin,
        기본지급(캐릭터, 'ARI-FN-229', {
          items: [
            { itemName: '체력 물약', quantity: 1 },
            { itemName: '사슬 갑옷', quantity: 1 },
          ],
        }),
      );
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      우편번호 = await 지급우편번호(admin, 지급번호);
      await verify('지급 우편을 찾았다', 우편번호 > 0, true, { blocker: true });
      const 원본 = await 우편저장글읽기(request, 토큰, 우편번호);
      await verify('지급 우편에 첨부가 둘 있다', 첨부번호글들(원본).length, 2, { blocker: true });
      const 고친글 = 첨부바꾸기(원본, 1);
      await verify('우편에 남길 첨부가 하나다', 첨부번호글들(고친글).length, 1, { blocker: true });
      const 저장 = await 우편저장(request, 토큰, 우편번호, 고친글);
      await verify('POST /api/savemailmessage 응답 코드가 기대 결과와 같다', 저장.status(), expected.응답코드, { blocker: true });
      const 회수 = await 지급회수(admin, 지급번호, '[QA] ARI-FN-229 회수 시험');
      회수됨 = 회수.ok();
      await verify('지급 회수 응답 코드가 기대 결과와 같다', 회수.status(), expected.응답코드, { blocker: true });
      const 상태 = await 지급우편상태기다리기(admin, 지급번호, [expected.우편상태]);
      await verify('일부를 가져간 우편을 회수하면 지급 기록의 우편 상태가 PARTLY_RECALLED 다', 상태, expected.우편상태);
      const 남은우편 = await 우편하나(request, 토큰, 우편번호);
      await verify('일부를 가져간 우편은 회수한 뒤에도 남아 있다', 남은우편.ok(), true);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
      await 우편들지우기(request, 토큰, [우편번호]);
    }
  });
});
