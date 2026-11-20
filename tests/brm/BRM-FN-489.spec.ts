import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-489',
  name: '로비에서 메뉴 「퀘스트」를 누르면 일일 퀘스트 창이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['state:장소=로비', 'state:장소=던전'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('메뉴 「퀘스트」를 누른다', async () => {
    const 로비창 = await 퀘스트창.열기(game).catch(() => null);
    const 로비열림 = await verify('로비에서 일일 퀘스트 창이 뜬다', 로비창 !== null, true);
    const 로비제목 = await verify('로비에서 일일 퀘스트 창 제목이 「일일 퀘스트」이다', 로비창 === null ? '' : await 로비창.제목(), '일일 퀘스트');
    await verify('로비에서 메뉴 「퀘스트」를 누르면 일일 퀘스트 창이 열린다', 로비열림 && 로비제목, true);
    if (로비창 !== null) await 로비창.닫기();
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    const 던전창 = await 퀘스트창.열기(game).catch(() => null);
    const 던전열림 = await verify('던전에서 일일 퀘스트 창이 뜬다', 던전창 !== null, true);
    const 던전제목 = await verify('던전에서 일일 퀘스트 창 제목이 「일일 퀘스트」이다', 던전창 === null ? '' : await 던전창.제목(), '일일 퀘스트');
    await verify('일일 퀘스트 창이 열린다', 던전열림 && 던전제목, true);
  });
});
