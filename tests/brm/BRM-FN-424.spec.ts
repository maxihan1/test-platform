import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-424',
  name: '점검으로 내보내지면 「서버 점검 중」 창에 적은 점검 안내 문구가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:점검=켜짐', 'state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    안내문구: z.string().min(1).describe('점검 안내 문구 — 아무 글이나 된다').default('[QA] 점검 안내 시험'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('점검 끄기', () => 점검끄기(admin));
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('운영툴에서 안내 문구를 적어 점검을 켠다', async () => {
    await 점검켜기(admin, { 안내: params.안내문구 });
    const 떴다 = await 안내창.제목이될때까지(game, '서버 점검 중', 45_000);
    await verify('「서버 점검 중」 창이 보인다', 떴다, true, { blocker: true });
    const 창 = await 안내창.뜰때까지(game, 5_000);
    const 본문 = 창 === null ? '' : await 창.본문();
    await verify('점검으로 내보내지면 「서버 점검 중」 창에 적은 점검 안내 문구가 보인다', 본문, params.안내문구);
    const 배치 = await game.layout(안내창.창);
    await verify('안내 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
});
