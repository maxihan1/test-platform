import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-260',
  name: '채팅 금지가 걸리면 20초 안에 보내는 글이 「채팅이 금지된 계정입니다」로 막힌다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정으로 로그인해 채팅 창을 열었다'],
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
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 로비에서 채팅 창을 연다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 로비로(game, 둘째, 둘째비밀번호);
      await 채팅창.열기(game);
    });
    await test.step('채팅 창이 열렸는지 확인한다', async () => {
      await verify('채팅 창에 입력 칸이 보인다', await 채팅창.지금(game).보이나(채팅창.입력칸), true, { blocker: true });
    });
    await test.step('채팅 금지를 건 뒤 20초 안에 다시 보낸다', async () => {
      const 창 = 채팅창.지금(game);
      제재번호 = await 제재걸기(admin, 둘째, 'CHAT_MUTE', '자동 시험 채팅 금지');
      const 시작 = Date.now();
      let 막혔다 = false;
      while (!막혔다 && Date.now() - 시작 < 20_000) {
        await 창.보내기('금지 뒤 글');
        막혔다 = await 토스트떴나(game, '채팅이 금지된 계정입니다', 3_000);
      }
      await verify('채팅 금지가 걸리면 20초 안에 보내는 글이 「채팅이 금지된 계정입니다」로 막힌다', 막혔다, true);
    });
  } finally {
    if (제재번호 !== 0) await 제재풀기(admin, 제재번호);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
