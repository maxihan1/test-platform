import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 팝업닫기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 끝날시각, 접속끊기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-262',
  name: '운영툴에서 채팅 금지를 풀면 같은 주기 안에 다시 채팅할 수 있다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정이 채팅 금지된 채 로그인해 있다', '두 번째 플레이어 계정의 정지를 풀었다'],
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
  let 정지번호 = 0;
  try {
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 채팅 금지를 건 뒤 로비에서 채팅 창을 연다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      제재번호 = await 제재걸기(admin, 둘째, 'CHAT_MUTE', '자동 시험 채팅 금지');
      await 로비로(game, 둘째, 둘째비밀번호);
      await 채팅창.열기(game);
    });
    await test.step('채팅 창이 열렸는지 확인한다', async () => {
      await verify('채팅 창에 입력 칸이 보인다', await 채팅창.지금(game).보이나(채팅창.입력칸), true, { blocker: true });
    });
    await test.step('채팅 금지를 풀고 20초 안에 다시 보낸다', async () => {
      const 창 = 채팅창.지금(game);
      await 제재풀기(admin, 제재번호);
      제재번호 = 0;
      const 시작 = Date.now();
      let 보인다 = false;
      while (!보인다 && Date.now() - 시작 < 20_000) {
        await 창.보내기('해제 뒤 글');
        보인다 = await 창.띠에뜰때까지('해제 뒤 글', 3_000);
      }
      await verify('운영툴에서 채팅 금지를 풀면 같은 주기 안에 다시 채팅할 수 있다', 보인다, true);
    });
    await test.step('두 번째 플레이어 계정을 정지시켜 내보낸 뒤 정지를 푼다', async () => {
      정지번호 = await 제재걸기(admin, 둘째, 'SUSPEND', '자동 시험 정지', 끝날시각(30));
      await 접속끊기(admin, 둘째);
      await 로그인화면.열기(game, 60_000);
      await 팝업닫기(game);
      await 제재풀기(admin, 정지번호);
      정지번호 = 0;
    });
    await test.step('두 번째 플레이어 계정으로 로그인한다', async () => {
      await 로비로(game, 둘째, 둘째비밀번호);
      await verify('정지를 푼 계정은 다시 로그인해 로비로 넘어간다', await 로비화면.지금(game).보이나(로비화면.준비), true);
    });
  } finally {
    await 팝업닫기(game);
    if (제재번호 !== 0) await 제재풀기(admin, 제재번호);
    if (정지번호 !== 0) await 제재풀기(admin, 정지번호);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
