import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 알림글읽기, 우편숫자기다리기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기, 기록없는우편 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-252',
  name: '기록에서 첨부 아이템을 하나도 못 찾고 골드도 없는 우편을 받으면 오류 알림 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」가 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  techniques: ['동등 분할'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  await test.step('시험 주소로 기록에 없는 첨부 우편을 넣고 「받기」를 누른다', async () => {
    await 기록없는우편(admin, 아이디, 비밀번호, '[QA] 기록 없는 첨부 우편');
    await verify('우편이 도착했다', await 우편숫자기다리기(new 공통HUD(game), 1, 60_000), true, { blocker: true });
    const 창 = await 우편함창.열기(game);
    await verify('우편함 창에 우편 줄이 보인다', await 창.줄뜰때까지(0), true, { blocker: true });
    await 창.받기누르기(0);
    const 알림 = await 알림글읽기(game, '첨부 정보를 읽지 못했습니다', 10_000);
    await verify('기록에서 첨부 아이템을 하나도 못 찾고 골드도 없는 우편을 받으면 오류 알림 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」가 뜬다', (알림 ?? '').includes('첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요'), true);
  });
});
