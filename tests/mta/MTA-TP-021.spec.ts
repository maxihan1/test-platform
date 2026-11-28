import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내글지우기, 사람글찾기 } from './helpers/api.helper.js';
import {
  게시기본값바꾸기,
  게시기본값읽기,
  글에서버튼누르기,
  글열기,
  새글쓰기열기,
  새글쓰기이어서,
  올라온글기다리기,
  인용하기누르기,
  조용한공개인용창넘기기,
} from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const URL글자수 = defineCase({
  tcId: 'MTA-FN-216',
  name: 'URL 하나를 적으면 남은 글자 수가 23자만큼 줄어든다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 새 글쓰기 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(41).max(500).describe('적을 글 — 40자를 넘는 https 주소 하나').default('https://example.com/qa-tp021-long-url-for-count-check'),
  }),
  expected: z.object({ 남은: z.number().describe('주소 하나를 적은 뒤 남은 글자 수').default(477) }),
});

const 멘션글자수 = defineCase({
  tcId: 'MTA-FN-217',
  name: '멘션 @이름@도메인을 적으면 남은 글자 수가 「@qa_user2」 9자만큼 줄어든다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 본문: z.string().min(1).describe('적을 글 — 멘션 하나').default('@qa_user2@mastodon.maxihan.com') }),
  expected: z.object({ 남은: z.number().describe('멘션 하나를 적은 뒤 남은 글자 수').default(491) }),
});

const 이모지글자수 = defineCase({
  tcId: 'MTA-FN-218',
  name: '이모지 하나를 적으면 남은 글자 수가 1 줄어든다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 본문: z.string().min(1).describe('적을 글 — 이모지 하나').default('😀') }),
  expected: z.object({ 남은: z.number().describe('이모지 하나를 적은 뒤 남은 글자 수').default(499) }),
});

const 경고글자수 = defineCase({
  tcId: 'MTA-FN-219',
  name: '내용 경고 칸에 2자를 적으면 남은 글자 수가 2 줄어든다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 경고: z.string().min(2).max(2).describe('경고 칸에 적을 글 — 2자').default('경고') }),
  expected: z.object({ 남은: z.number().describe('경고 칸에 2자를 적은 뒤 남은 글자 수').default(498) }),
});

const 경고문구없음 = defineCase({
  tcId: 'MTA-FN-245',
  name: '「열람 주의」를 켜고 문구를 비워 게시하면 그 글은 문구 없이 민감함으로 올라간다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP021」로 시작하는 500자까지').default('QA TP021 문구 없는 열람 주의') }),
  expected: null,
});

const 언어미지정 = defineCase({
  tcId: 'MTA-FN-249',
  name: '언어를 고르지 않고 게시하면 그 글에 언어가 보내지지 않는다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP021」로 시작하는 영어 문장').default('QA TP021 language check this sentence is written in plain english'),
  }),
  expected: z.object({ 언어: z.string().describe('서버가 본문에서 감지한 언어 — 앱이 언어를 보내지 않았을 때').default('en') }),
});

const 기본값공개 = defineCase({
  tcId: 'MTA-FN-259',
  name: '새 글쓰기를 열면 공개 범위 버튼이 설정 「게시 기본값」과 같은 「공개」로 시작한다',
  platforms: ['android'],
  precondition: ['게시 기본값의 「게시 범위」가 「공개」다'],
  params: z.object({}),
  expected: z.object({ 범위: z.string().describe('공개 범위 버튼 글').default('공개') }),
});

const 조용한공개답장 = defineCase({
  tcId: 'MTA-FN-260',
  name: '조용한 공개 글에 답장하면 공개 범위가 원문과 기본값 가운데 더 좁은 「조용한 공개」로 시작한다',
  platforms: ['android'],
  precondition: ['seoyeon_books 의 조용한 공개 글이 있다'],
  params: z.object({}),
  expected: z.object({ 범위: z.string().describe('답장 글쓰기의 공개 범위 버튼 글').default('조용한 공개') }),
});

const 조용한공개인용 = defineCase({
  tcId: 'MTA-FN-261',
  name: '제한적 공개 글을 인용하면 공개 범위가 제한적 공개로 시작한다',
  platforms: ['android'],
  precondition: ['seoyeon_books 의 조용한 공개 글이 있다'],
  params: z.object({}),
  expected: z.object({ 범위: z.string().describe('인용 글쓰기의 공개 범위 버튼 글').default('제한적 공개') }),
});

const 해시태그자동완성 = defineCase({
  tcId: 'MTA-FN-637',
  name: '본문에 「#」 뒤에 글자를 이어 적으면 해시태그 자동 완성 줄이 뜬다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 본문: z.string().min(2).describe('적을 글 — 「#」 뒤에 글자 하나 이상').default('#카') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-021',
  name: '글쓰기 — 글자 수 세기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [URL글자수, 멘션글자수, 이모지글자수, 경고글자수, 경고문구없음, 언어미지정, 기본값공개, 조용한공개답장, 조용한공개인용, 해시태그자동완성],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  let 나: 계정 | undefined;
  let 처음기본값: string | undefined;

  await test.cleanup('이 흐름이 올린 글을 지우고 게시 기본값을 되돌린다', async () => {
    if (나 === undefined) return;
    await 내글지우기(나, 'QA TP021');
    if (처음기본값 !== undefined && (await 게시기본값읽기(나)) !== 처음기본값) await 게시기본값바꾸기(나, 처음기본값);
  });

  await test.case(URL글자수, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 새 글쓰기 화면을 연다', async () => {
      await 내글지우기(나!, 'QA TP021');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('본문에 40자 넘는 https 주소 하나를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(params.본문);
      await verify('URL 하나를 적으면 남은 글자 수가 23자만큼 줄어든다', await 글쓰기.글자수가될때까지(expected.남은), true);
    });
  });

  await test.case(멘션글자수, async ({ params, expected }) => {
    await test.step('멘션을 적으려고 본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('본문에 「@qa_user2@mastodon.maxihan.com」을 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(params.본문);
      await verify('멘션 @이름@도메인을 적으면 남은 글자 수가 「@qa_user2」 9자만큼 줄어든다', await 글쓰기.글자수가될때까지(expected.남은), true);
    });
  });

  await test.case(이모지글자수, async ({ params, expected }) => {
    await test.step('이모지를 적으려고 본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('본문에 이모지 「😀」 하나를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(params.본문);
      await verify('이모지 하나를 적으면 남은 글자 수가 1 줄어든다', await 글쓰기.글자수가될때까지(expected.남은), true);
    });
  });

  await test.case(경고글자수, async ({ params, expected }) => {
    await test.step('경고 칸을 켜려고 본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('「열람 주의」를 켜고 경고 칸에 「경고」 2자를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.도구누르기('열람 주의');
      await 글쓰기.열람주의적기(params.경고);
      await verify('내용 경고 칸에 2자를 적으면 남은 글자 수가 2 줄어든다', await 글쓰기.글자수가될때까지(expected.남은), true);
    });
  });

  await test.case(경고문구없음, async ({ params }) => {
    await test.step('문구 없는 열람 주의 글을 올리려고 본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('「열람 주의」를 켜고 문구를 비운 채 「게시」를 누른다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.도구누르기('열람 주의');
      await 글쓰기.본문적기(params.본문);
      await 글쓰기.게시누르기();
      const 올림 = await 올라온글기다리기(driver, 나!, params.본문);
      const 민감함 = 올림?.sensitive === true && 올림.spoiler_text === '';
      await verify('「열람 주의」를 켜고 문구를 비워 게시하면 그 글은 문구 없이 민감함으로 올라간다', 민감함, true);
    });
  });

  await test.case(언어미지정, async ({ params, expected }) => {
    await test.step('언어를 고르지 않은 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('언어를 고르지 않고 「게시」를 누른다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(params.본문);
      await 글쓰기.게시누르기();
      const 올림 = await 올라온글기다리기(driver, 나!, params.본문);
      await verify('언어를 고르지 않고 게시하면 그 글에 언어가 보내지지 않는다', 올림?.language ?? '', expected.언어);
    });
  });

  await test.case(기본값공개, async ({ expected }) => {
    await test.step('게시 기본값의 「게시 범위」를 「공개」로 맞춘다', async () => {
      처음기본값 = await 게시기본값읽기(나!);
      if (처음기본값 !== 'public') await 게시기본값바꾸기(나!, 'public');
    });
    await test.step('새 글쓰기 공개 범위 버튼을 확인한다', async () => {
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기를 열면 공개 범위 버튼이 설정 「게시 기본값」과 같은 「공개」로 시작한다', await 글쓰기.공개범위글(), expected.범위);
    });
  });

  await test.case(조용한공개답장, async ({ expected }) => {
    await test.step('seoyeon_books 의 조용한 공개 글을 연다', async () => {
      const 글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.visibility === 'unlisted' && x.reblog === null, '조용한 공개');
      await 글열기(driver, 글);
    });
    await test.step('조용한 공개 글에 「답장」을 누른다', async () => {
      const 글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.visibility === 'unlisted' && x.reblog === null, '조용한 공개');
      await 글에서버튼누르기(driver, 글, '답장');
      const 글쓰기 = new 글쓰기화면(driver);
      await verify(
        '조용한 공개 글에 답장하면 공개 범위가 원문과 기본값 가운데 더 좁은 「조용한 공개」로 시작한다',
        await 글쓰기.공개범위글(),
        expected.범위,
      );
    });
  });

  await test.case(조용한공개인용, async ({ expected }) => {
    await test.step('인용할 seoyeon_books 의 조용한 공개 글을 연다', async () => {
      const 글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.visibility === 'unlisted' && x.reblog === null, '조용한 공개');
      await 글열기(driver, 글);
    });
    await test.step('조용한 공개 글을 「인용하기」로 연다', async () => {
      const 글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.visibility === 'unlisted' && x.reblog === null, '조용한 공개');
      await 인용하기누르기(driver, 글);
      await 조용한공개인용창넘기기(driver);
      const 글쓰기 = new 글쓰기화면(driver);
      await verify('제한적 공개 글을 인용하면 공개 범위가 제한적 공개로 시작한다', await 글쓰기.공개범위글(), expected.범위);
    });
  });

  await test.case(해시태그자동완성, async ({ params }) => {
    await test.step('해시태그를 적으려고 본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('본문에 「#카」를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(params.본문);
      await verify('본문에 「#」 뒤에 글자를 이어 적으면 해시태그 자동 완성 줄이 뜬다', await 글쓰기.자동완성떴나(), true);
    });
  });
});
