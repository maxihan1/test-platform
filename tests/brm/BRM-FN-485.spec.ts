import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 사기, 서버개수, 서버골드 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-485',
  name: '시작 골드 200 으로 녹슨 단검과 가죽 갑옷을 사면 둘 다 가방에 들어오고 골드가 「20 G」가 된다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:녹슨 단검', 'shop:가죽 갑옷', 'flow:골드-상점 구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('녹슨 단검과 가죽 갑옷을 차례로 산다', async () => {
    await 사기(game, '녹슨 단검');
    await 사기(game, '가죽 갑옷');
    await hud.골드가될때까지('20 G');
    const 가방 = await 가방창.열기(game);
    const 화면단검 = await verify('가방 창에 녹슨 단검 줄이 하나 있다', await 가방.이름줄수('녹슨 단검'), 1);
    const 화면갑옷 = await verify('가방 창에 가죽 갑옷 줄이 하나 있다', await 가방.이름줄수('가죽 갑옷'), 1);
    const 서버단검 = await verify('운영툴 캐릭터 아이템에서 녹슨 단검이 1개다', await 서버개수(admin, 나, '녹슨 단검'), 1);
    const 서버갑옷 = await verify('운영툴 캐릭터 아이템에서 가죽 갑옷이 1개다', await 서버개수(admin, 나, '가죽 갑옷'), 1);
    const 화면골드 = await verify('상단 바 골드가 「20 G」다', await hud.골드글(), '20 G');
    const 서버골드값 = await verify('운영툴 캐릭터 골드가 20 이다', await 서버골드(admin, 나), 20);
    await verify('시작 골드 200 으로 녹슨 단검과 가죽 갑옷을 사면 둘 다 가방에 들어오고 골드가 「20 G」가 된다', 화면단검 && 화면갑옷 && 서버단검 && 서버갑옷 && 화면골드 && 서버골드값, true);
  });
});
