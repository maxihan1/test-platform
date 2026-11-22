import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지띠글유지, 공지켜고로비들어가기 } from './helpers/mail-notice.helper.js';
import { QA공지모두지우기, 실패걸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-415',
  name: '서버 상태 읽기 요청 두 번이 실패하게 걸고 다음 읽기를 기다리면 공지 읽기에 실패해도 공지 띠에 바로 전에 읽은 공지가 그대로 보인다',
  platforms: ['windows'],
  precondition: ['[QA] 공지 하나가 로비 공지 띠에 보인다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    한도초: z.number().describe('다음 읽기를 기다리는 시간(초)').default(65),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('[QA] 공지 모두 지우기', () => QA공지모두지우기(admin));

  const 제목 = '[QA] 계속 보일 공지';
  await test.step('[QA] 공지를 켜고 로비 공지 띠에 보이는 것을 확인한다', async () => {
    const 상태 = await 공지켜고로비들어가기(game, admin, 아이디, 비밀번호, [{ 제목, 본문: 'QA 공지 본문' }], 60_000);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('로비 공지 띠에 공지가 보인다', 상태.보임, true, { blocker: true });
  });

  await test.step('서버 상태 읽기 요청 두 번이 실패하게 걸고 다음 읽기를 기다린다', async () => {
    await 실패걸기(admin, '/api/serverstatus', 2);
    await verify('서버 상태 읽기 요청 두 번이 실패하게 걸고 다음 읽기를 기다리면 공지 읽기에 실패해도 공지 띠에 바로 전에 읽은 공지가 그대로 보인다', await 공지띠글유지(game, 제목, expected.한도초 * 1000), true);
  });
});
