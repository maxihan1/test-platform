import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새글쓰기열기, 새글쓰기이어서 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 길이글 } from './helpers/test-data.helper.js';
import { 글쓰기투표 } from './pages/compose-poll.page.js';
import { 홈화면 } from './pages/home.page.js';

const 머리확인 = defineCase({
  tcId: 'MTA-UI-168',
  name: '새 글쓰기 상단에 닫기 · 제목 「새 게시물」 · 「게시」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 새 글쓰기 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 제목: z.string().describe('새 글쓰기 상단 제목').default('새 게시물') }),
});

const 글쓴이줄 = defineCase({
  tcId: 'MTA-UI-170',
  name: '글쓰기에 아바타 · 표시 이름 · 「@qa_user1@mastodon.maxihan.com」이 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 계정: z.string().describe('글쓴이 계정 줄').default('@qa_user1@mastodon.maxihan.com') }),
});

const 도구줄 = defineCase({
  tcId: 'MTA-UI-176',
  name: '글쓰기 도구 줄에 「미디어 추가」 · 「투표 추가」 · 「에모지」 · 「열람 주의」 · 언어 · 공개 범위가 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 글자수줄어듦 = defineCase({
  tcId: 'MTA-FN-209',
  name: '본문에 3자를 적으면 남은 글자 수가 500에서 497로 줄어든다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 본문: z.string().min(3).max(3).describe('적을 글 — 3자').default('가나다') }),
  expected: z.object({
    처음: z.number().describe('아무것도 적기 전 남은 글자 수').default(500),
    남은: z.number().describe('3자를 적은 뒤 남은 글자 수').default(497),
  }),
});

const 열람주의켜기 = defineCase({
  tcId: 'MTA-FN-208',
  name: '글쓰기 「열람 주의」를 켜면 힌트 「열람 주의」 경고 입력 칸이 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 힌트: z.string().describe('경고 입력 칸 힌트').default('열람 주의') }),
});

const 투표추가 = defineCase({
  tcId: 'MTA-FN-215',
  name: '「투표 추가」를 누르면 항목 힌트 「옵션 1」 · 「옵션 2」 · 「투표 옵션 추가」 · 「설문 길이」 · 「스타일」이 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    첫항목: z.string().describe('첫째 항목 힌트').default('옵션 1'),
    둘째항목: z.string().describe('둘째 항목 힌트').default('옵션 2'),
  }),
});

const 게시꺼짐 = defineCase({
  tcId: 'MTA-FN-221',
  name: '본문과 미디어가 둘 다 없으면 「게시」가 꺼진다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있고 미디어가 없다'],
  techniques: ['결정 테이블'],
  params: z.object({ 공백: z.string().min(1).describe('본문에 적을 공백 — 공백 문자만').default('   ') }),
  expected: null,
});

const 글자수초과 = defineCase({
  tcId: 'MTA-FN-211',
  name: '본문이 500자를 넘치면 남은 글자 수가 「-1」로 빨갛게 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다', '본문에 501자가 적혀 있다'],
  techniques: ['결정 테이블'],
  params: z.object({}),
  expected: z.object({ 남은글자: z.number().describe('501자를 적은 뒤 남은 글자 수').default(-1) }),
});

const 멘션자동완성 = defineCase({
  tcId: 'MTA-FN-578',
  name: '본문에 「@」를 적으면 자동 완성 줄에 「찾고자 하는 대상을 찾아보세요」가 보인다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있다'],
  params: z.object({ 본문: z.string().min(1).describe('적을 글 — 멘션을 시작하는 「@」 하나').default('@') }),
  expected: z.object({ 안내: z.string().describe('자동 완성 줄 안내 글').default('찾고자 하는 대상을 찾아보세요') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-020',
  name: '글쓰기 — 화면과 입력 제한',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [머리확인, 글쓴이줄, 도구줄, 글자수줄어듦, 열람주의켜기, 투표추가, 게시꺼짐, 글자수초과, 멘션자동완성],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 투표 = new 글쓰기투표(driver);

  await test.case(머리확인, async ({ expected }) => {
    await test.step('일반 회원으로 홈에 들어가 새 글쓰기 화면을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('새 글쓰기 머리를 확인한다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      const 닫기 = await verify('새 글쓰기 상단에 닫기 버튼이 보인다', await 글쓰기.닫기있나(), true);
      const 제목 = await verify('새 글쓰기 상단 제목이 기대값과 같다', await 글쓰기.제목글(), expected.제목);
      const 게시 = await verify('새 글쓰기 상단에 「게시」가 보인다', await 글쓰기.게시있나(), true);
      await verify('새 글쓰기 상단에 닫기 · 제목 「새 게시물」 · 「게시」가 보인다', 닫기 && 제목 && 게시, true);
    });
  });

  await test.case(글쓴이줄, async ({ expected }) => {
    await test.step('글쓴이 줄을 확인한다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      const 아바타 = await verify('글쓴이 줄에 아바타가 보인다', await 글쓰기.글쓴이아바타있나(), true);
      const 이름 = await verify('글쓴이 줄에 표시 이름이 보인다', (await 글쓰기.글쓴이이름글()).length > 0, true);
      const 계정 = await verify('글쓴이 줄 계정이 기대값과 같다', await 글쓰기.글쓴이계정글(), expected.계정);
      await verify('글쓰기에 아바타 · 표시 이름 · 「@qa_user1@mastodon.maxihan.com」이 보인다', 아바타 && 이름 && 계정, true);
    });
  });

  await test.case(도구줄, async () => {
    await test.step('도구 줄을 확인한다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      const 미디어 = await verify('도구 줄에 「미디어 추가」가 보인다', await 글쓰기.도구있나('미디어'), true);
      const 투표추가보임 = await verify('도구 줄에 「투표 추가」가 보인다', await 글쓰기.도구있나('투표'), true);
      const 에모지 = await verify('도구 줄에 「에모지」가 보인다', await 글쓰기.도구있나('에모지'), true);
      const 열람주의 = await verify('도구 줄에 「열람 주의」가 보인다', await 글쓰기.도구있나('열람 주의'), true);
      const 언어 = await verify('도구 줄에 언어 버튼이 보인다', await 글쓰기.도구있나('언어'), true);
      const 공개범위 = await verify('도구 줄에 공개 범위 버튼이 보인다', await 글쓰기.공개범위있나(), true);
      await verify(
        '글쓰기 도구 줄에 「미디어 추가」 · 「투표 추가」 · 「에모지」 · 「열람 주의」 · 언어 · 공개 범위가 보인다',
        미디어 && 투표추가보임 && 에모지 && 열람주의 && 언어 && 공개범위,
        true,
      );
    });
  });

  await test.case(글자수줄어듦, async ({ params, expected }) => {
    await test.step('본문에 「가나다」 3자를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      const 처음 = await verify('본문을 적기 전 남은 글자 수가 500이다', await 글쓰기.글자수가될때까지(expected.처음), true);
      await 글쓰기.본문적기(params.본문);
      const 줄어듦 = await 글쓰기.글자수가될때까지(expected.남은);
      await verify('본문에 3자를 적으면 남은 글자 수가 500에서 497로 줄어든다', 처음 && 줄어듦, true);
    });
  });

  await test.case(열람주의켜기, async ({ expected }) => {
    await test.step('열람 주의 경고 칸이 없는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('도구 줄에서 「열람 주의」를 켠다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.도구누르기('열람 주의');
      const 칸 = await verify('글쓰기 「열람 주의」 경고 입력 칸이 보인다', await 글쓰기.열람주의칸있나(), true);
      const 힌트 = await verify('경고 입력 칸 힌트가 기대값과 같다', await 글쓰기.열람주의칸글(), expected.힌트);
      await verify('글쓰기 「열람 주의」를 켜면 힌트 「열람 주의」 경고 입력 칸이 보인다', 칸 && 힌트, true);
    });
  });

  await test.case(투표추가, async ({ expected }) => {
    await test.step('투표 칸이 없는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('도구 줄에서 「투표 추가」를 누른다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.도구누르기('투표');
      const 칸 = await verify('투표 칸이 보인다', await 투표.떴나(), true);
      const 첫째 = await verify('투표 첫째 항목 힌트가 기대값과 같다', await 투표.항목글(0), expected.첫항목);
      const 둘째 = await verify('투표 둘째 항목 힌트가 기대값과 같다', await 투표.항목글(1), expected.둘째항목);
      const 추가 = await verify('「투표 옵션 추가」가 보인다', await 투표.항목추가있나(), true);
      const 길이 = await verify('「설문 길이」가 보인다', await 투표.설문길이있나(), true);
      const 스타일 = await verify('「스타일」이 보인다', await 투표.스타일있나(), true);
      await verify(
        '「투표 추가」를 누르면 항목 힌트 「옵션 1」 · 「옵션 2」 · 「투표 옵션 추가」 · 「설문 길이」 · 「스타일」이 보인다',
        칸 && 첫째 && 둘째 && 추가 && 길이 && 스타일,
        true,
      );
    });
  });

  await test.case(게시꺼짐, async ({ params }) => {
    await test.step('본문과 미디어가 없는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('본문을 비운다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문비우기();
      await verify('본문과 미디어가 둘 다 없으면 「게시」가 꺼진다', await 글쓰기.게시꺼질때까지(), true);
    });
    await test.step('본문에 공백만 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(params.공백);
      await verify('본문에 공백만 있고 미디어가 없을 때도 「게시」가 꺼진다', await 글쓰기.게시꺼질때까지(), true);
    });
  });

  await test.case(글자수초과, async ({ expected }) => {
    await test.step('본문이 비어 있는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('본문에 501자를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문적기(길이글(501, '가'));
      await verify('본문이 500자를 넘치면 남은 글자 수가 「-1」로 빨갛게 보인다', await 글쓰기.글자수가될때까지(expected.남은글자), true);
    });
    await test.step('500자를 넘긴 채 「게시」를 확인한다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await verify('500자를 넘친 본문에서는 「게시」가 꺼진다', await 글쓰기.게시꺼질때까지(), true);
    });
  });

  await test.case(멘션자동완성, async ({ params, expected }) => {
    await test.step('자동 완성 줄이 없는 새 글쓰기 화면을 연다', async () => {
      await 새글쓰기열기(driver);
    });
    await test.step('본문에 「@」를 적는다', async () => {
      const 글쓰기 = await 새글쓰기이어서(driver);
      await 글쓰기.본문쳐넣기(params.본문);
      await verify('본문에 「@」를 적으면 자동 완성 줄에 「찾고자 하는 대상을 찾아보세요」가 보인다', await 글쓰기.자동완성에글자있나(expected.안내), true);
    });
  });
});
