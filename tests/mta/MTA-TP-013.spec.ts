import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 내정보, 부스트, 부스트취소, 사람글찾기 } from './helpers/api.helper.js';
import {
  긴글찾기,
  더보기있나,
  민감글열기,
  이름,
  카드글자,
  평범한글,
  프로필열고글찾기,
  프로필열고경고문찾기,
  홈에서글찾기,
  화면글자있나,
  화면글자포함있나,
  화면글자누르기,
  친구목록에서글찾기,
} from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 검색화면 } from './pages/search.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 홈화면 } from './pages/home.page.js';

const 부스트와답장 = defineCase({
  tcId: 'MTA-UI-123',
  name: '부스트한 글 카드 위에 「<이름> 님이 부스트했습니다」 줄이 보인다',
  platforms: ['android'],
  precondition: ['내가 부스트한 글과 내가 쓴 답장이 홈에 있다', '내가 쓴 답장이 홈에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    답장: z.string().min(1).max(500).describe('API 로 올릴 답장 — 「QA TP013」으로 시작하는 500자까지').default('QA TP013 답장'),
  }),
  expected: null,
});

const 남의글머리 = defineCase({
  tcId: 'MTA-UI-125',
  name: '글 카드 머리에 표시 이름 · 「<시간> · @<계정>」 · 더보기(…)가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 사용자의 글이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('두 번째 사용자가 API 로 올릴 글 — 「QA TP013」으로 시작하는 500자까지').default('QA TP013 남의 글'),
  }),
  expected: null,
});

const 아바타열기 = defineCase({
  tcId: 'MTA-FN-150',
  name: '글 카드 아바타를 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['홈에 news_bot 글이 보인다'],
  params: z.object({}),
  expected: null,
});

const 고정배지 = defineCase({
  tcId: 'MTA-UI-128',
  name: '프로필의 고정 글 카드에 「Pinned」 배지가 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 프로필에 고정 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 긴글더보기 = defineCase({
  tcId: 'MTA-UI-129',
  name: '긴 글 본문 카드에 「더보기」가 보인다',
  platforms: ['android'],
  precondition: ['minjun_dev 의 긴 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 경고글표시 = defineCase({
  tcId: 'MTA-FN-156',
  name: '내용 경고 글 카드에서 「무시하고 표시」를 누르면 본문과 「다시 숨기기」가 보인다',
  platforms: ['android'],
  precondition: ['seoyeon_books 의 내용 경고 글이 있다'],
  params: z.object({}),
  expected: z.object({ 다시숨기기: z.string().describe('펼친 내용 경고 글의 버튼 글자').default('다시 숨기기') }),
});

const 경고글카드 = defineCase({
  tcId: 'MTA-UI-130',
  name: '내용 경고 글 카드에 경고 문구와 「무시하고 표시」가 보인다',
  platforms: ['android'],
  precondition: ['seoyeon_books 의 내용 경고 글이 있다'],
  params: z.object({}),
  expected: z.object({ 동작글: z.string().describe('숨겨진 내용 경고 글의 버튼 글자').default('무시하고 표시') }),
});

const 민감표시 = defineCase({
  tcId: 'MTA-FN-158',
  name: '민감 미디어 가림막에서 「표시」를 누르면 「숨기기」가 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 의 민감한 미디어 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 민감가림막 = defineCase({
  tcId: 'MTA-UI-132',
  name: '민감 미디어 카드에 「작성자가 미디어를 민감하다고 설정했습니다.」와 「표시」가 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 의 민감한 미디어 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 설명없는사진 = defineCase({
  tcId: 'MTA-UI-133',
  name: '설명이 없는 미디어 카드에 「설명이 없는 미디어」가 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 의 설명 없는 사진 글이 있다'],
  params: z.object({}),
  expected: z.object({ 설명: z.string().describe('설명이 없는 사진의 설명 글자').default('설명이 없는 미디어') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-013',
  name: '글 카드 — 머리와 본문',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [부스트와답장, 남의글머리, 아바타열기, 고정배지, 긴글더보기, 경고글표시, 경고글카드, 민감표시, 민감가림막, 설명없는사진],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 부스트한글id: string | undefined;

  await test.cleanup('이 흐름이 올리고 부스트한 것을 되돌린다', async () => {
    if (나 !== undefined) {
      if (부스트한글id !== undefined) await 부스트취소(나, 부스트한글id);
      await 내글지우기(나, 'QA TP013');
    }
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP013');
  });

  await test.case(부스트와답장, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    const 나정보 = await 내정보(나);
    const 부스트대상 = await 사람글찾기(나, 'jiho_cafe', 평범한글, '평범한 공개 글');
    const 답장대상 = await 사람글찾기(나, 'minjun_dev', 평범한글, '평범한 공개 글');
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(나!, 'QA TP013');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('API 로 답장을 달고 다른 글을 부스트한다', async () => {
      await 글쓰기(나!, params.답장, { in_reply_to_id: 답장대상.id });
      await 부스트(나!, 부스트대상.id);
      부스트한글id = 부스트대상.id;
      await 홈에들어가기(driver);
      await verify('홈 맨 위에 부스트한 글이 보인다', await 홈.새로고침해맨위에올때까지(카드글자(부스트대상)), true, { blocker: true });
    });
    await test.step('홈에서 부스트한 글 카드 위 줄을 확인한다', async () => {
      const 줄 = await 카드.위줄글(카드글자(부스트대상));
      await verify('부스트한 글 카드 위에 「<이름> 님이 부스트했습니다」 줄이 보인다', 줄.includes(`${이름(나정보)} 님이 부스트했습니다`), true);
    });
    await test.step('홈에서 답장 글 카드 위 줄을 확인한다', async () => {
      await 홈에서글찾기(driver, params.답장);
      const 줄 = await 카드.위줄글(params.답장);
      await verify('답장 글 카드 위에 「<이름> 님에게 답장」 줄이 보인다', 줄.includes(`${이름(답장대상.account)} 님에게 답장`), true);
    });
  });

  await test.case(남의글머리, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 새 글을 올린다', async () => {
      await 글쓰기(둘째!, params.본문);
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.본문);
    });
    await test.step('글 카드 머리를 확인한다', async () => {
      const 둘째정보 = await 내정보(둘째!);
      const 표시이름 = await 카드.머리글(params.본문, 'name');
      const 시간계정 = await 카드.머리글(params.본문, 'time_and_username');
      const 이름보임 = await verify('글 카드에 표시 이름이 보인다', 표시이름 === 이름(둘째정보), true);
      const 시간보임 = await verify('글 카드에 「<시간> · @<계정>」이 보인다', 시간계정.includes(` · @${둘째정보.username}`), true);
      const 더보기보임 = await verify('글 카드에 더보기(…)가 보인다', await 더보기있나(driver, params.본문), true);
      await verify('글 카드 머리에 표시 이름 · 「<시간> · @<계정>」 · 더보기(…)가 보인다', 이름보임 && 시간보임 && 더보기보임, true);
    });
  });

  await test.case(아바타열기, async () => {
    const 뉴스글 = await 사람글찾기(나!, 'news_bot', () => true, '아무');
    await test.step('홈에서 news_bot 글 카드를 찾는다', async () => {
      await 홈에들어가기(driver);
      await 홈에서글찾기(driver, 카드글자(뉴스글));
    });
    await test.step('글 카드 아바타를 누른다', async () => {
      await 카드.아바타누르기(카드글자(뉴스글));
      const 열림 = await verify('프로필이 열린다', await new 프로필화면(driver).떴나(), true);
      const 계정 = await verify('열린 프로필이 글쓴이의 것이다', (await new 프로필화면(driver).계정글()).includes('news_bot'), true);
      await verify('글 카드 아바타를 누르면 그 사람 프로필이 열린다', 열림 && 계정, true);
    });
  });

  await test.case(고정배지, async () => {
    await test.step('hana_photo 프로필을 연다', async () => {
      await 홈에들어가기(driver);
      await new 검색화면(driver).프로필열기('hana_photo');
    });
    await test.step('hana_photo 프로필 첫 글 카드를 확인한다', async () => {
      await verify('프로필의 고정 글 카드에 「Pinned」 배지가 보인다', await new 프로필글목록(driver).고정배지있나(), true);
    });
  });

  await test.case(긴글더보기, async () => {
    const 긴글 = await 긴글찾기(나!, 'minjun_dev');
    await test.step('minjun_dev 의 긴 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(긴글));
    });
    await test.step('minjun_dev 긴 글 카드를 확인한다', async () => {
      await verify('긴 글 본문 카드에 「더보기」가 보인다', await 화면글자포함있나(driver, '더보기'), true);
    });
  });

  await test.case(경고글표시, async ({ expected }) => {
    const 경고글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.reblog === null && x.spoiler_text !== '' && !x.sensitive, '내용 경고');
    await test.step('seoyeon_books 프로필에서 내용 경고 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고경고문찾기(driver, 'seoyeon_books', 경고글.spoiler_text);
    });
    await test.step('내용 경고 글에서 「무시하고 표시」를 누른다', async () => {
      await 카드.경고동작누르기(경고글.spoiler_text);
      const 본문 = await verify('본문이 보인다', await 될때까지(driver, () => 카드.보이나(카드글자(경고글)), 10_000), true);
      const 버튼 = await verify('「다시 숨기기」가 보인다', await 될때까지(driver, async () => (await 카드.경고동작글(경고글.spoiler_text)) === expected.다시숨기기, 10_000), true);
      await verify('내용 경고 글 카드에서 「무시하고 표시」를 누르면 본문과 「다시 숨기기」가 보인다', 본문 && 버튼, true);
    });
  });

  await test.case(경고글카드, async ({ expected }) => {
    const 경고글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.reblog === null && x.spoiler_text !== '' && !x.sensitive, '내용 경고');
    await test.step('seoyeon_books 프로필에서 숨겨진 내용 경고 글 카드를 다시 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고경고문찾기(driver, 'seoyeon_books', 경고글.spoiler_text);
    });
    await test.step('내용 경고 글 카드를 확인한다', async () => {
      const 문구 = await verify('경고 문구가 보인다', (await 카드.경고문글들()).some((글) => 글.includes(경고글.spoiler_text)), true);
      const 버튼 = await verify('「무시하고 표시」가 보인다', await 카드.경고동작글(경고글.spoiler_text), expected.동작글);
      await verify('내용 경고 글 카드에 경고 문구와 「무시하고 표시」가 보인다', 문구 && 버튼, true);
    });
  });

  await test.case(민감표시, async () => {
    const 민감글 = await 사람글찾기(나!, 'hana_photo', (x) => x.reblog === null && x.sensitive && x.media_attachments.length > 0, '민감한 미디어');
    await test.step('hana_photo 프로필에서 민감한 미디어 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 민감글열기(driver, 'hana_photo', 민감글);
    });
    await test.step('민감 미디어 가림막에서 「표시」를 누른다', async () => {
      await 화면글자누르기(driver, '표시');
      await verify('민감 미디어 가림막에서 「표시」를 누르면 「숨기기」가 보인다', await 화면글자있나(driver, '숨기기', 10_000), true);
    });
  });

  await test.case(민감가림막, async () => {
    const 민감글 = await 사람글찾기(나!, 'hana_photo', (x) => x.reblog === null && x.sensitive && x.media_attachments.length > 0, '민감한 미디어');
    await test.step('hana_photo 프로필에서 가려진 민감한 미디어 글 카드를 다시 연다', async () => {
      await 홈에들어가기(driver);
      await 민감글열기(driver, 'hana_photo', 민감글);
    });
    await test.step('민감 미디어 가림막을 확인한다', async () => {
      const 안내 = await verify('「작성자가 미디어를 민감하다고 설정했습니다.」가 보인다', await 화면글자포함있나(driver, '작성자가 미디어를 민감하다고 설정했습니다.'), true);
      const 버튼 = await verify('「표시」가 보인다', await 화면글자있나(driver, '표시'), true);
      await verify('민감 미디어 카드에 「작성자가 미디어를 민감하다고 설정했습니다.」와 「표시」가 보인다', 안내 && 버튼, true);
    });
  });

  await test.case(설명없는사진, async ({ expected }) => {
    const 사진글 = await 사람글찾기(
      나!,
      'hana_photo',
      (x) => x.reblog === null && !x.sensitive && x.spoiler_text === '' && x.media_attachments.length > 0 && x.media_attachments.every((m) => !m.description),
      '설명 없는 사진',
    );
    await test.step('hana_photo 프로필에서 설명 없는 사진 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'hana_photo', 카드글자(사진글));
    });
    await test.step('설명 없는 사진 글 카드를 확인한다', async () => {
      const 설명들 = await 카드.사진설명들(카드글자(사진글));
      await verify('설명이 없는 미디어 카드에 「설명이 없는 미디어」가 보인다', 설명들[0] ?? '', expected.설명);
    });
  });
});
