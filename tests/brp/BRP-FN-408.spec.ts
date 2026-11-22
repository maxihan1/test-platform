import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 공지켜고로비들어가기 } from './helpers/mail-notice.helper.js';
import { QA공지모두지우기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-408',
  name: '로비 공지 띠 글을 읽으면 공지 띠 글은 「[공지]」 머리 뒤에 제목과 「 — 」 · 본문이 이어진 꼴이다',
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

  const 제목 = '[QA] 공지 띠 모양';
  const 본문 = 'QA 공지 본문';
  await test.step('[QA] 공지를 켜고 로비 공지 띠에 보이는 것을 확인한다', async () => {
    const 상태 = await 공지켜고로비들어가기(game, admin, 아이디, 비밀번호, [{ 제목, 본문 }]);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('로비 공지 띠에 공지가 보인다', 상태.보임, true, { blocker: true });
  });

  await test.step('로비 공지 띠 글을 읽는다', async () => {
    const 글 = 색글떼기(await game.text(공통HUD.공지띠글주소));
    const 머리 = await verify('공지 띠 글이 「[공지]」로 시작한다', 글.startsWith('[공지]'), true);
    const 이음 = await verify('「[공지]」 뒤에 제목과 「 — 」 · 본문이 이어진다', 글.includes(`${제목} — ${본문}`), true);
    await verify('로비 공지 띠 글을 읽으면 공지 띠 글은 「[공지]」 머리 뒤에 제목과 「 — 」 · 본문이 이어진 꼴이다', 머리 && 이음, true);
  });
});
