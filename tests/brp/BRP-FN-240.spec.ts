import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-240',
  name: '체력 물약 2개 · 사슬 갑옷 1개 · 골드 100 을 단 우편을 지급하고 우편함 창을 열면 지급한 우편 줄에 그 우편의 제목과 보낸 사람이 보인다',
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

  const 제목 = '[QA] 지급 내용 우편';
  await test.step('체력 물약 2개 · 사슬 갑옷 1개 · 골드 100 을 단 우편을 지급하고 우편함 창을 연다', async () => {
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 2 }, { itemName: '사슬 갑옷', quantity: 1 }], 골드: 100 }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('지급한 우편 줄이 있다', 번호 >= 0, true, { blocker: true });
    const 제목맞음 = await verify('우편 줄 제목이 지급한 제목이다', (await 창.제목들())[번호], 제목);
    const 보낸사람 = await verify('우편 줄 둘째 줄에 보낸 사람이 들어 있다', (await 창.둘째글(번호)).trim().length > 0, true);
    await verify('체력 물약 2개 · 사슬 갑옷 1개 · 골드 100 을 단 우편을 지급하고 우편함 창을 열면 지급한 우편 줄에 그 우편의 제목과 보낸 사람이 보인다', 제목맞음 && 보낸사람, true);
    const 첨부 = await 창.첨부글(번호);
    const 물약 = await verify('첨부에 「체력 물약」이 보인다', 첨부.includes('체력 물약'), true);
    const 갑옷 = await verify('첨부에 「사슬 갑옷」이 보인다', 첨부.includes('사슬 갑옷'), true);
    const 골드 = await verify('첨부에 「100 골드」가 보인다', 첨부.includes('100 골드'), true);
    await verify('지급한 우편 줄 첨부에 「체력 물약」 · 「사슬 갑옷」과 「100 골드」가 보인다', 물약 && 갑옷 && 골드, true);
  });
});
