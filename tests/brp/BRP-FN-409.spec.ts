import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 공지켜고로비들어가기 } from './helpers/mail-notice.helper.js';
import { 검정인가, 바탕색, 반투명인가, 태그색 } from './helpers/screen-check.helper.js';
import { QA공지모두지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-409',
  name: '로비 공지 띠의 글씨와 바탕을 읽으면 공지 띠의 「[공지]」 글자에 색이 입혀져 있다',
  platforms: ['windows'],
  precondition: ['[QA] 공지 하나가 켜져 있다'],
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

  await test.step('[QA] 공지를 켜고 로비 공지 띠에 보이는 것을 확인한다', async () => {
    const 상태 = await 공지켜고로비들어가기(game, admin, 아이디, 비밀번호, [{ 제목: '[QA] 공지 띠 색', 본문: 'QA 공지 본문' }]);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('로비 공지 띠에 공지가 보인다', 상태.보임, true, { blocker: true });
  });

  await test.step('로비 공지 띠의 글씨와 바탕을 읽는다', async () => {
    await verify('로비 공지 띠의 글씨와 바탕을 읽으면 공지 띠의 「[공지]」 글자에 색이 입혀져 있다', 태그색(await game.text(공통HUD.공지띠글주소), '[공지]') !== null, true);
    const 바탕 = await 바탕색(game, '/Showcase HUD/NoticeBar/Bg');
    const 검정 = await verify('공지 띠 바탕이 검정이다', 검정인가(바탕), true);
    const 반투명 = await verify('공지 띠 바탕이 반투명하다', 반투명인가(바탕), true);
    await verify('공지 띠 바탕은 검정이고 반투명하다', 검정 && 반투명, true);
  });
});
