import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버 } from './helpers/app.helper.js';
import { 가입서버고르기로가기, 서버입력에붙여넣기, 필터칩모두읽기 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 가입서버고르기, 초대링크창 } from './pages/server-pick.page.js';
import { 시작화면 } from './pages/start.page.js';

const 입력칸힌트 = defineCase({
  tcId: 'MTA-UI-022',
  name: '가입 경로 서버 고르기 입력 칸에 힌트 「서버이름 혹은 URL」이 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 힌트: z.string().describe('입력 칸 힌트').default('서버이름 혹은 URL') }),
});

const 필터칩 = defineCase({
  tcId: 'MTA-UI-024',
  name: '가입 경로 서버 고르기에 「모든 언어」 · 「모든 가입 속도-어떠한 가입 속도」 · 「즉시 가입」 · 「수동 검토」 · 「일반」 · 「특별한 관심사」 · 지역 필터 칩이 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 다음꺼짐 = defineCase({
  tcId: 'MTA-UI-030',
  name: '서버 고르기 화면에 서버를 고르기 전 「다음」이 꺼져 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 초대링크 = defineCase({
  tcId: 'MTA-FN-031',
  name: '가입 경로 서버 고르기에서 「초대 링크 사용하기」를 누르면 「초대 링크 입력하기」 입력 창이 뜬다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 창제목: z.string().describe('입력 창 제목').default('초대 링크 입력하기') }),
});

const 서버카드 = defineCase({
  tcId: 'MTA-FN-020',
  name: '가입 경로 서버 고르기에 「mastodon.maxihan.com」을 적으면 그 서버 카드가 목록 맨 위에 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({ 서버입력: z.string().min(1).describe('입력 칸에 적을 서버 — 우리 서버 호스트').default(서버) }),
  expected: null,
});

const 점없는글 = defineCase({
  tcId: 'MTA-FN-021',
  name: '서버 입력에 점이 없는 「maxihan」을 적으면 mastodon.maxihan.com 서버 카드가 보이지 않는다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({ 점없는입력: z.string().min(1).describe('입력 칸에 적을 글 — 점이 없는 서버 이름 조각').default('maxihan') }),
  expected: null,
});

const 주소붙여넣기 = defineCase({
  tcId: 'MTA-FN-034',
  name: '서버 입력에 https 주소를 붙여 넣으면 서버 카드에 호스트 「mastodon.maxihan.com」만 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({ 붙여넣을주소: z.string().min(1).describe('붙여 넣을 주소 — 우리 서버의 https 주소').default(`https://${서버}/about`) }),
  expected: null,
});

const 대문자공백 = defineCase({
  tcId: 'MTA-FN-035',
  name: '서버 입력에 대문자와 앞뒤 공백을 섞어 적으면 서버 카드에 「mastodon.maxihan.com」이 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({ 섞어쓴입력: z.string().min(1).describe('입력 칸에 적을 글 — 우리 서버 호스트를 대문자와 앞뒤 공백으로 쓴 글').default(` ${서버.toUpperCase()} `) }),
  expected: null,
});

const 없는서버 = defineCase({
  tcId: 'MTA-FN-601',
  name: '가입 경로에서 맞는 서버가 없는 글을 적으면 「“qanoserverzz” 서버를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({ 없는서버: z.string().min(1).describe('입력 칸에 적을 글 — 어느 서버와도 안 맞는 글').default('qanoserverzz') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-002',
  name: '가입 서버 고르기 — 화면과 입력',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [입력칸힌트, 필터칩, 다음꺼짐, 초대링크, 서버카드, 점없는글, 대문자공백, 없는서버, 주소붙여넣기],
});

test(procedure, async ({ driver }) => {
  const 고르기 = new 가입서버고르기(driver);

  await test.case(입력칸힌트, async ({ expected }) => {
    await test.step('가입용 서버 고르기 입력 칸을 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await verify('가입 경로 서버 고르기 입력 칸에 힌트 「서버이름 혹은 URL」이 보인다', await 고르기.입력칸글(), expected.힌트);
    });
  });

  await test.case(필터칩, async () => {
    await test.step('가입용 서버 고르기 필터 칩을 확인한다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      const 칩들 = await 필터칩모두읽기(driver);
      const 여섯 = ['모든 언어', '모든 가입 속도-어떠한 가입 속도', '즉시 가입', '수동 검토', '일반', '특별한 관심사'];
      const 언어 = await verify('필터 칩 「모든 언어」가 보인다', 칩들.includes('모든 언어'), true);
      const 속도 = await verify('필터 칩 「모든 가입 속도-어떠한 가입 속도」가 보인다', 칩들.includes('모든 가입 속도-어떠한 가입 속도'), true);
      const 즉시 = await verify('필터 칩 「즉시 가입」이 보인다', 칩들.includes('즉시 가입'), true);
      const 수동 = await verify('필터 칩 「수동 검토」가 보인다', 칩들.includes('수동 검토'), true);
      const 일반 = await verify('필터 칩 「일반」이 보인다', 칩들.includes('일반'), true);
      const 관심사 = await verify('필터 칩 「특별한 관심사」가 보인다', 칩들.includes('특별한 관심사'), true);
      const 지역 = await verify('지역 필터 칩이 보인다', 칩들.some((칩) => !여섯.includes(칩)), true);
      await verify(
        '가입 경로 서버 고르기에 「모든 언어」 · 「모든 가입 속도-어떠한 가입 속도」 · 「즉시 가입」 · 「수동 검토」 · 「일반」 · 「특별한 관심사」 · 지역 필터 칩이 보인다',
        언어 && 속도 && 즉시 && 수동 && 일반 && 관심사 && 지역,
        true,
      );
    });
  });

  await test.case(다음꺼짐, async () => {
    await test.step('서버를 고르기 전 「다음」을 확인한다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await verify('서버 고르기 화면에 서버를 고르기 전 「다음」이 꺼져 보인다', await 고르기.다음켜졌나(), false);
    });
  });

  await test.case(초대링크, async ({ expected }) => {
    await test.step('「초대 링크 사용하기」를 누른다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.초대링크누르기();
      const 창 = new 초대링크창(driver);
      const 떴다 = await verify('입력 창이 뜬다', await 창.떴나(), true);
      const 제목 = await verify('입력 창 제목이 「초대 링크 입력하기」다', 떴다 ? await 창.제목글() : '', expected.창제목);
      await verify('가입 경로 서버 고르기에서 「초대 링크 사용하기」를 누르면 「초대 링크 입력하기」 입력 창이 뜬다', 떴다 && 제목, true);
    });
  });

  await test.case(서버카드, async ({ params }) => {
    await test.step('입력 칸에 「mastodon.maxihan.com」을 적는다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.서버입력);
      const 카드 = await verify('서버 카드 「mastodon.maxihan.com」이 보인다', await 고르기.카드있나(서버), true);
      const 맨위 = await verify('서버 카드 「mastodon.maxihan.com」이 목록 맨 위에 있다', await 고르기.맨위카드제목(), 서버);
      await verify('가입 경로 서버 고르기에 「mastodon.maxihan.com」을 적으면 그 서버 카드가 목록 맨 위에 보인다', 카드 && 맨위, true);
    });
  });

  await test.case(점없는글, async ({ params }) => {
    await test.step('입력 칸에 점이 없는 「maxihan」을 적는다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.점없는입력);
      await verify('서버 입력에 점이 없는 「maxihan」을 적으면 mastodon.maxihan.com 서버 카드가 보이지 않는다', await 고르기.카드사라질때까지(서버), true);
    });
  });

  await test.case(대문자공백, async ({ params }) => {
    await test.step('입력 칸에 앞뒤 공백을 붙인 「 MASTODON.MAXIHAN.COM 」을 적는다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.섞어쓴입력);
      await verify('서버 입력에 대문자와 앞뒤 공백을 섞어 적으면 서버 카드에 「mastodon.maxihan.com」이 보인다', await 고르기.카드있나(서버), true);
    });
  });

  await test.case(없는서버, async ({ params }) => {
    await test.step('입력 칸에 어느 서버와도 안 맞는 「qanoserverzz」를 적는다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.없는서버);
      await verify('가입 경로에서 맞는 서버가 없는 글을 적으면 「“qanoserverzz” 서버를 찾을 수 없습니다」가 보인다', await 고르기.빈목록글읽기(), `“${params.없는서버}” 서버를 찾을 수 없습니다`);
    });
  });

  await test.case(주소붙여넣기, async ({ params }) => {
    await test.step('입력 칸에 「https://mastodon.maxihan.com/about」을 붙여 넣는다', async () => {
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 서버입력에붙여넣기(driver, params.붙여넣을주소);
      await verify('서버 입력에 https 주소를 붙여 넣으면 서버 카드에 호스트 「mastodon.maxihan.com」만 보인다', await 고르기.카드있나(서버), true);
    });
  });
});
