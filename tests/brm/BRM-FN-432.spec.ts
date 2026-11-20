import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 계정상태, 봇모두끄기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-432',
  name: '끝 없는 채팅 금지면 오류 알림에 「해제할 때까지」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 있고 끝 없는 채팅 금지가 걸려 있다'],
  techniques: ['동등 분할', '상태 전이'],
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
  await test.step('두 번째 플레이어로 로비에 들어가 끝 없는 채팅 금지를 건다', async () => {
    await 로비준비(game, driver, 나);
    await verify('두 번째 플레이어가 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const 상태 = await 계정상태(admin, 나.아이디);
    제재번호 = await 제재걸기(admin, 상태.id, 'CHAT_MUTE', 'qa 제재 사유 340');
    await verify('두 번째 플레이어에게 채팅 금지가 걸려 있다', (await 계정상태(admin, 나.아이디)).chatMuted, true, { blocker: true });
  });
  await test.step('「전체」 탭에서 채팅을 보낸다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('전체');
    await 채팅.보내기('qa 금지 340');
    const 떴다 = await 채팅.hud.알림뜸('채팅이 금지된 계정입니다');
    const 글 = 떴다 ? await 채팅.알림글('채팅이 금지된 계정입니다') : null;
    await verify('끝 없는 채팅 금지면 오류 알림에 「해제할 때까지」가 보인다', 글?.includes('해제할 때까지') ?? false, true);
  });
});
