import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 공지켜고로비들어가기 } from './helpers/mail-notice.helper.js';
import { QA공지모두지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-410',
  name: '로비 공지 띠를 읽으면 본문이 긴 공지도 공지 띠에 한 줄로 보인다',
  platforms: ['windows'],
  precondition: ['본문이 긴 [QA] 공지 하나가 켜져 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('[QA] 공지 모두 지우기', () => QA공지모두지우기(admin));

  await test.step('본문이 긴 [QA] 공지를 켜고 로비 공지 띠에 보이는 것을 확인한다', async () => {
    const 상태 = await 공지켜고로비들어가기(game, admin, 아이디, 비밀번호, [{ 제목: '[QA] 긴 공지', 본문: '긴 본문 공지 시험 글입니다 '.repeat(15).trim() }]);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('로비 공지 띠에 공지가 보인다', 상태.보임, true, { blocker: true });
  });

  await test.step('로비 공지 띠를 읽는다', async () => {
    await verify('로비 공지 띠를 읽으면 본문이 긴 공지도 공지 띠에 한 줄로 보인다', Number(await game.get(공통HUD.공지띠글주소, 'TextMeshProUGUI.textInfo.lineCount')), 1);
  });
});
