import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 알림띠 } from './components/toast.component.js';
import { 가방줄들, 우편숫자기다리기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기, 기록없는우편 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-264',
  name: '시험 주소로 기록에 없는 첨부 우편을 넣고 「받기」를 누르면 기록에서 찾을 수 없는 첨부는 받기를 눌러도 가방에 안 들어가고 우편 줄에 첨부가 남아 있다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
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
    const 전 = (await 가방줄들(game)).join(' | ');
    await 기록없는우편(admin, 아이디, 비밀번호, '[QA] 기록 없는 첨부 우편');
    await verify('우편이 도착했다', await 우편숫자기다리기(new 공통HUD(game), 1, 60_000), true, { blocker: true });
    const 창 = await 우편함창.열기(game);
    await verify('우편함 창에 우편 줄이 보인다', await 창.줄뜰때까지(0), true, { blocker: true });
    await 창.받기누르기(0);
    await new 알림띠(game).뜰때까지('첨부 정보를 읽지 못했습니다', 10_000);
    const 첨부남음 = await verify('우편 줄에 첨부가 남아 있다', (await 창.첨부글(0)).includes('알 수 없는 아이템'), true);
    await 창.닫기();
    const 가방그대로 = await verify('가방 줄이 그대로다', (await 가방줄들(game)).join(' | '), 전);
    await verify('시험 주소로 기록에 없는 첨부 우편을 넣고 「받기」를 누르면 기록에서 찾을 수 없는 첨부는 받기를 눌러도 가방에 안 들어가고 우편 줄에 첨부가 남아 있다', 첨부남음 && 가방그대로, true);
  });
});
