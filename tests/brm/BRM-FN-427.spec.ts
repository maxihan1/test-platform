import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 계정상태, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-427',
  name: '접속 중에 정지되면 30초 안에 내보내져 「이용 정지 계정」 창에 「사유: 」 줄이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
  elements: ['state:제재=정지', 'state:장소=로비'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    사유: z.string().min(1).describe('정지 사유 — 아무 글이나 된다').default('[QA] 정지 시험'),
    오차초: z.number().min(0).describe('주기를 넘겨 기다리는 여유(초)').default(5),
  }),
  expected: z.object({
    주기초: z.number().describe('정지 확인 주기(초)').default(30),
  }),
});

test(spec, async ({ game, driver, admin, params, expected }) => {
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 제재번호: number | undefined;
  await test.cleanup('제재 풀기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    if (제재번호 !== undefined) await 제재풀기(admin, 제재번호);
    await 계정되돌리기(admin, 두번째);
  });
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 두번째);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('운영툴로 사유를 적어 정지한다', async () => {
    const 계정번호 = (await 계정상태(admin, 두번째.아이디)).id;
    제재번호 = await 제재걸기(admin, 계정번호, 'SUSPEND', params.사유);
    const 떴다 = await 안내창.제목이될때까지(game, '이용 정지 계정', (expected.주기초 + params.오차초) * 1000);
    const 창 = await 안내창.뜰때까지(game, 5_000);
    const 본문 = 창 === null ? '' : await 창.본문();
    const 제목 = await verify('「이용 정지 계정」 창이 보인다', 떴다, true);
    const 사유줄 = await verify('「사유: 」 줄이 보인다', 본문.includes(`사유: ${params.사유}`), true);
    await verify('접속 중에 정지되면 30초 안에 내보내져 「이용 정지 계정」 창에 「사유: 」 줄이 보인다', 제목 && 사유줄, true);
  });
});
