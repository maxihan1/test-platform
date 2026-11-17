import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-259',
  name: '끝나는 시각 없이 채팅 금지된 계정이 보내면 오류 알림에 「해제할 때까지」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정이 끝나는 시각 없이 채팅 금지돼 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  let 제재번호 = 0;
  try {
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 채팅 금지를 건 뒤 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      제재번호 = await 제재걸기(admin, 둘째, 'CHAT_MUTE', '자동 시험 채팅 금지');
      await 로비로(game, 둘째, 둘째비밀번호);
    });
    await test.step('두 번째 플레이어 계정이 로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('두 번째 플레이어 계정으로 로그인해 전체 채팅을 보낸다', async () => {
      const 창 = await 채팅창.열기(game);
      await 창.보내기('금지 중인 글');
      await verify('끝나는 시각 없이 채팅 금지된 계정이 보내면 오류 알림에 「해제할 때까지」가 보인다', await 토스트떴나(game, '해제할 때까지'), true);
    });
  } finally {
    if (제재번호 !== 0) await 제재풀기(admin, 제재번호);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
