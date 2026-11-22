import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글읽기, 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-260',
  name: '여러 첨부를 받으면 「받음:」 알림에 「체력 물약 x2」와 「사슬 갑옷」이 보이고 맨 뒤에 「100 골드」가 붙는다',
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

  await test.step('체력 물약 2개 · 사슬 갑옷 1개 · 골드 100 을 단 우편을 지급하고 「받기」를 누른다', async () => {
    const 제목 = '[QA] 여러 첨부 우편';
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 2 }, { itemName: '사슬 갑옷', quantity: 1 }], 골드: 100 }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await 창.받기누르기(번호);
    const 글 = 색글떼기((await 알림글읽기(game, '받음:', 10_000)) ?? '');
    const 머리 = await verify('알림에 「받음:」이 들어 있다', 글.includes('받음:'), true);
    const 물약 = await verify('알림에 「체력 물약 x2」가 보인다', 글.includes('체력 물약 x2'), true);
    const 갑옷 = await verify('알림에 「사슬 갑옷」이 보인다', 글.includes('사슬 갑옷'), true);
    const 골드 = await verify('알림 맨 뒤에 「100 골드」가 붙는다', 글.endsWith('100 골드'), true);
    await verify('여러 첨부를 받으면 「받음:」 알림에 「체력 물약 x2」와 「사슬 갑옷」이 보이고 맨 뒤에 「100 골드」가 붙는다', 머리 && 물약 && 갑옷 && 골드, true);
  });
});
