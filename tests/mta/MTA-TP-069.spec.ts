import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 뒤로보냈다오기, 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내글지우기 } from './helpers/api.helper.js';
import { 내글들, 새글쓰기열기, 올라온글기다리기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 통신끊김게시 = defineCase({
  tcId: 'MTA-FN-629',
  name: '통신이 끊긴 채 「게시」를 누르면 앱이 멈추지 않고 끊김 안내가 보이고 다시 연결된 뒤 글이 두 번 올라가지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 새 글쓰기에 「QA 끊김」으로 시작하는 본문을 적었다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).max(500).describe('올릴 글 — 「QA 끊김」으로 시작하는 500자까지').default('QA 끊김 두 번 올라가지 않는지 확인'),
  }),
  expected: z.object({
    안내: z.string().describe('게시에 실패했을 때 뜨는 창 글').default('게시물 작성 실패'),
    올라간수: z.number().describe('다시 연결된 뒤 올라간 글 수').default(1),
  }),
});

const 내렸다올리기 = defineCase({
  tcId: 'MTA-FN-630',
  name: '글쓰기에서 앱을 내렸다 올리면 적던 본문이 남아 있다',
  platforms: ['android'],
  precondition: ['새 글쓰기에 본문을 적고 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('본문에 적을 글 — 비어 있지 않은 글').default('QA TP069 내렸다 올려도 남는 글'),
    초: z.number().int().min(1).max(30).describe('앱을 내려 둘 초').default(5),
  }),
  expected: null,
});

const 화면돌리기 = defineCase({
  tcId: 'MTA-FN-631',
  name: '글쓰기에서 화면을 세 번 돌리면 적던 본문이 남고 「게시」가 다시 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기에 본문을 적고 있다'],
  techniques: ['오류 추정'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('본문에 적을 글 — 비어 있지 않은 글').default('QA TP069 돌려도 남는 글') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-069',
  name: '글쓰기 — 오류 추정',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [통신끊김게시, 내렸다올리기, 화면돌리기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 === undefined) return;
    await 내글지우기(나, 'QA TP069');
    await 내글지우기(나, 'QA 끊김');
  });

  await test.case(통신끊김게시, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 「QA 끊김」으로 시작하는 본문을 적은 새 글쓰기 화면을 연다', async () => {
      await 내글지우기(나!, 'QA TP069');
      await 내글지우기(나!, 'QA 끊김');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 새글쓰기열기(driver);
      await 작성.본문적기(params.본문);
    });
    await test.step('통신을 끊은 채 「게시」를 누른다', async () => {
      let 끊김안내 = false;
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 작성.게시누르기();
        끊김안내 = await 작성.창에글자있나(expected.안내, 20_000);
      });
      if (끊김안내) await 작성.작성실패창().확인누르기();
      await 올라온글기다리기(driver, 나!, params.본문, 45_000);
      const 수 = (await 내글들(나!, params.본문)).length;
      const 앱응답 = await 홈.떴나(20_000);
      await verify(
        '통신이 끊긴 채 「게시」를 누르면 앱이 멈추지 않고 끊김 안내가 보이고 다시 연결된 뒤 글이 두 번 올라가지 않는다',
        끊김안내 && 앱응답 && 수 === expected.올라간수,
        true,
      );
    });
  });

  await test.case(내렸다올리기, async ({ params }) => {
    await test.step('본문을 적는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
      await 작성.본문적기(params.본문);
    });
    await test.step('본문을 적다가 앱을 5초 내렸다 올린다', async () => {
      await 뒤로보냈다오기(driver, params.초);
      await verify('글쓰기에서 앱을 내렸다 올리면 적던 본문이 남아 있다', (await 작성.본문칸글()).includes(params.본문), true);
    });
  });

  await test.case(화면돌리기, async ({ params }) => {
    await test.step('화면을 돌릴 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
      await 작성.본문적기(params.본문);
    });
    await test.step('본문을 적다가 화면을 가로 · 세로로 세 번 돌린다', async () => {
      await 폰상태에서(driver, { 방향: '가로' }, async () => {
        await 작성.게시있나(10_000);
      });
      await 폰상태에서(driver, { 방향: '세로' }, async () => {
        await 작성.게시있나(10_000);
      });
      await 폰상태에서(driver, { 방향: '가로' }, async () => {
        await 작성.게시있나(10_000);
      });
      const 본문 = await verify('돌린 뒤에도 적던 본문이 남아 있다', (await 작성.본문칸글()).includes(params.본문), true);
      const 게시 = await verify('돌린 뒤에 「게시」가 다시 보인다', await 작성.게시있나(10_000), true);
      await verify('글쓰기에서 화면을 세 번 돌리면 적던 본문이 남고 「게시」가 다시 보인다', 본문 && 게시, true);
    });
  });
});
