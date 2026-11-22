import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글읽기, 첨부비운우편만들기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-269',
  name: '첨부 있는 우편이 없을 때 「모두 받기」를 누르면 오류 알림 「받을 첨부가 없습니다」가 뜬다',
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

  await test.step('첨부 없는 우편 하나를 만든 것을 확인한다', async () => {
    const 결과 = await 첨부비운우편만들기(game, admin, 아이디, [{ 제목: '[QA] 비운 우편', 아이템: [{ itemName: '체력 물약', quantity: 1 }] }]);
    await verify('우편 줄이 「첨부 없음」이다', 결과.비웠음, true, { blocker: true });
  });

  await test.step('첨부 없는 우편만 있을 때 「모두 받기」를 누른다', async () => {
    const 창 = await 우편함창.열기(game);
    await 창.모두받기누르기();
    const 알림 = await 알림글읽기(game, '받을 첨부가 없습니다', 10_000);
    await verify('첨부 있는 우편이 없을 때 「모두 받기」를 누르면 오류 알림 「받을 첨부가 없습니다」가 뜬다', (알림 ?? '').includes('받을 첨부가 없습니다'), true);
  });
});
