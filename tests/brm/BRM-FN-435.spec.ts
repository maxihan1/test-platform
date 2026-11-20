import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 채팅금지될때까지 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 계정상태, 봇모두끄기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-435',
  name: '채팅 금지를 걸면 20초 안에 채팅이 막혀 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
  elements: ['state:제재=채팅 금지'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 제재번호: number | null = null;
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기 · 건 제재 풀기', async () => {
    await 봇모두끄기(admin);
    if (제재번호 !== null) await 제재풀기(admin, 제재번호);
    await 계정되돌리기(admin, 나);
  });
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비준비(game, driver, 나);
    await verify('두 번째 플레이어가 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('운영툴로 채팅 금지를 건 뒤 채팅을 되풀이해 보낸다', async () => {
    const 상태 = await 계정상태(admin, 나.아이디);
    제재번호 = await 제재걸기(admin, 상태.id, 'CHAT_MUTE', 'qa 제재 사유 342');
    const 채팅 = await 채팅창.열기(game);
    await verify('채팅 금지를 걸면 20초 안에 채팅이 막혀 오류 알림이 뜬다', await 채팅금지될때까지(채팅, 'qa 반복 342', 20_000), true);
  });
});
