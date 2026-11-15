import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 고유이름, 본문JSON, 시각 } from './helpers/api.helper.js';
import { 서버토큰, 제한상태, 제한상태부르기 } from './helpers/data.helper.js';
import { 시각같음 } from './helpers/notice.helper.js';
import { 채팅금지걸기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-158',
  name: '끝 시각을 정해 채팅 금지를 걸면 chatMuted 가 참이다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 계정번호 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 채팅 금지를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
  });
  await test.step('「두 번째 플레이어」에 끝 시각을 정한 채팅 금지를 건 뒤 POST /api/getaccountrestrictions 를 부른다', async () => {
    try {
      const 사유 = 고유이름('ARI-FN-158 채팅 금지');
      const 끝 = 시각(60);
      const 걸기 = await 채팅금지걸기(admin, 계정번호, { reason: 사유, endsAt: 끝 });
      await verify('「두 번째 플레이어」에 끝 시각을 정한 채팅 금지가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 응답 = await 제한상태부르기(request, 토큰, 계정번호);
      await verify('POST /api/getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드, { blocker: true });
      const 몸 = await 본문JSON<제한상태>(응답);
      await verify('끝 시각을 정해 채팅 금지를 걸면 chatMuted 가 참이다', 몸.chatMuted, true);
      await verify('chatMutedUntil 이 건 끝 시각과 같다', 시각같음(몸.chatMutedUntil, 끝), true);
      await verify('chatMuteReason 이 건 사유와 같다', 몸.chatMuteReason, 사유);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
});
