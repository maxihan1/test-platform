import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 실패걸기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-425',
  name: '점검 안내 문구를 못 읽으면 「서버 점검 중입니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에 접속해 있다'],
  elements: ['state:점검=켜짐'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    안내문구: z.string().min(1).describe('점검 안내 문구 — 아무 글이나 된다').default('[QA] 점검 시험'),
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
  await test.step('점검을 켜고 다음 서버 상태 읽기 하나를 실패하게 건 뒤 내보내지기를 기다린다', async () => {
    await 점검켜기(admin, { 안내: params.안내문구 });
    await 실패걸기(admin, '/api/serverstatus');
    const 창 = await 안내창.뜰때까지(game, 60_000);
    const 본문 = 창 === null ? '' : await 창.본문();
    await verify('점검 안내 문구를 못 읽으면 「서버 점검 중입니다」가 보인다', 본문, '서버 점검 중입니다');
  });
});
