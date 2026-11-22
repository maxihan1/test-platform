import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 공지띠글기다리기 } from './helpers/mail-notice.helper.js';
import { QA공지모두지우기, 공지올리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-405',
  name: '운영툴에서 공지를 켜면 1분 안팎(75초 안)에 로비 공지 띠에 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    한도초: z.number().describe('공지 띠에 보이는 한도(초)').default(75),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('[QA] 공지 모두 지우기', () => QA공지모두지우기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('운영 API 로 [QA] 공지를 켜고 공지 띠를 기다린다', async () => {
    const 제목 = '[QA] 로비 공지 시험';
    const 시작 = Date.now();
    await 공지올리기(admin, 제목, 'QA 공지 본문');
    const 보임 = await verify('로비 공지 띠에 공지가 보인다', await 공지띠글기다리기(game, 제목, 90_000), true);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 시간 = await verify('한도 안에 보인다', 걸린초 <= expected.한도초, true);
    await verify('운영툴에서 공지를 켜면 1분 안팎(75초 안)에 로비 공지 띠에 보인다', 보임 && 시간, true);
  });
});
