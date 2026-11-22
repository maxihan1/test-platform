import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 던전입장 } from './helpers/game-enter.helper.js';
import { 공지켜고로비들어가기 } from './helpers/mail-notice.helper.js';
import { QA공지모두지우기, 로비로되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-407',
  name: '공지가 켜져 있어도 던전에 들어가면 공지 띠가 숨는다',
  platforms: ['windows'],
  precondition: ['[QA] 공지 하나가 켜져 있고 로비 공지 띠에 보인다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 [QA] 공지 모두 지우기', async () => {
    await 로비로되돌리기(admin);
    await QA공지모두지우기(admin);
  });

  await test.step('[QA] 공지를 켜고 로비 공지 띠에 보이는 것을 확인한다', async () => {
    const 상태 = await 공지켜고로비들어가기(game, admin, 아이디, 비밀번호, [{ 제목: '[QA] 던전 입장 공지', 본문: 'QA 공지 본문' }]);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('로비 공지 띠에 공지가 보인다', 상태.보임, true, { blocker: true });
  });

  await test.step('「준비!」를 눌러 던전에 들어간다', async () => {
    await 던전입장(game, '탱커');
    const 숨음 = await game.waitFor(공통HUD.공지띠글주소, { gone: true, timeoutMs: 15_000 }).then(
      () => true,
      () => false,
    );
    await verify('공지가 켜져 있어도 던전에 들어가면 공지 띠가 숨는다', 숨음, true);
  });
});
