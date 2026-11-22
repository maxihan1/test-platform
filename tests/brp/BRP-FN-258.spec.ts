import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기, 캐릭터값기다리기, 캐릭터읽기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-258',
  name: '골드 150 을 단 우편을 지급하고 「받기」를 누르면 우편 첨부를 받은 직후 캐릭터를 저장해 운영 API 골드가 저장 주기를 기다리지 않고 150 늘어 있다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    한도초: z.number().describe('받은 직후 운영 API 골드가 바뀌는 한도(초)').default(5),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  await test.step('골드 150 을 단 우편을 지급하고 「받기」를 누른다', async () => {
    const 제목 = '[QA] 저장 시점 우편';
    const 전 = (await 캐릭터읽기(admin, 아이디)).gold;
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 골드: 150 }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await 창.받기누르기(번호);
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => c.gold === 전 + 150, expected.한도초 * 1000);
    await verify('골드 150 을 단 우편을 지급하고 「받기」를 누르면 우편 첨부를 받은 직후 캐릭터를 저장해 운영 API 골드가 저장 주기를 기다리지 않고 150 늘어 있다', 값.gold - 전, 150);
  });
});
