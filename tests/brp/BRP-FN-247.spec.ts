import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글읽기, 우편함로그인, 캐릭터번호 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기, 우편지급 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-247',
  name: '접속 중에 새 우편이 오면 「새 우편」과 「통이 도착했습니다」가 든 알림이 뜬다',
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

  await test.step('접속한 채 운영 API 로 우편을 지급하고 알림을 기다린다', async () => {
    await 우편지급(admin, await 캐릭터번호(admin, 아이디), { 제목: '[QA] 접속 중 알림 우편', 아이템: [{ itemName: '체력 물약', quantity: 1 }] });
    const 알림 = await 알림글읽기(game, '통이 도착했습니다', 60_000);
    const 앞 = await verify('알림에 「새 우편」이 들어 있다', (알림 ?? '').includes('새 우편'), true);
    const 뒤 = await verify('알림에 「통이 도착했습니다」가 들어 있다', (알림 ?? '').includes('통이 도착했습니다'), true);
    await verify('접속 중에 새 우편이 오면 「새 우편」과 「통이 도착했습니다」가 든 알림이 뜬다', 앞 && 뒤, true);
  });
});
