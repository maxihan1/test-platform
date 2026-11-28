import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 글쓰기, 내글지우기 } from './helpers/api.helper.js';
import { 홈에서글보일때까지, 홈에서줄까지내리기 } from './helpers/flow-share.helper.js';
import { 화면글자포함누르기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 빈틈줄 = defineCase({
  tcId: 'MTA-FN-141',
  name: '당겨서 불러온 새 글이 20건이면 「위에서 놓친 게시물 불러오기」 빈틈 줄이 생긴다',
  platforms: ['android'],
  held: '보류 — 화면에 「위에서 놓친 게시물 불러오기」가 든 글이 안 보인다',
  precondition: ['일반 회원으로 로그인해 홈 맨 위 글을 읽어 두었다', '홈에 빈틈 줄이 생겼다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    첫글: z.string().min(1).max(500).describe('가장 먼저 올릴 글 — 「QA TP011」로 시작하는 500자까지').default('QA TP011 놓친 글'),
    글머리: z.string().min(1).max(100).describe('나머지 글의 머리 — 「QA TP011」로 시작하는 100자까지').default('QA TP011 새 글'),
  }),
  expected: z.object({ 빈틈줄: z.string().describe('빈틈 줄 글').default('위에서 놓친 게시물 불러오기') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-011',
  name: '홈 빈틈 줄',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [빈틈줄],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP011');
  });

  await test.case(빈틈줄, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 맨 위 글을 읽어 둔다', async () => {
      await 내글지우기(나!, 'QA TP011');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('내가 글 21건을 서버에 올린 뒤 홈을 당겨서 새로고침한다', async () => {
      await 글쓰기(나!, params.첫글);
      for (let 번 = 2; 번 <= 21; 번++) await 글쓰기(나!, `${params.글머리} ${String(번)}`);
      await 홈.당겨서새로고침();
      await verify('당겨서 불러온 새 글이 20건이면 「위에서 놓친 게시물 불러오기」 빈틈 줄이 생긴다', await 홈에서줄까지내리기(driver, expected.빈틈줄), true);
    });
    await test.step('빈틈 줄을 누른다', async () => {
      await 화면글자포함누르기(driver, expected.빈틈줄);
      await verify('빈틈 줄을 누른 뒤 그 구간의 글을 불러온다', await 홈에서글보일때까지(driver, params.첫글), true);
    });
  });

});
