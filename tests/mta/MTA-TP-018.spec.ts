import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 내정보, 사람글들, 사람글찾기 } from './helpers/api.helper.js';
import { 더보기열기, 이름, 카드글자, 프로필열고글찾기, 홈에서글찾기, 친구목록에서글찾기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 내글메뉴 = defineCase({
  tcId: 'MTA-UI-153',
  name: '내 글 더보기에 「프로필에 고정」 · 「수정」 · 「삭제」 · 「대화 뮤트하기」가 보인다',
  platforms: ['android'],
  precondition: ['내가 쓴 공개 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP018」로 시작하는 500자까지').default('QA TP018 내 글'),
  }),
  expected: null,
});

const 인용변경항목 = defineCase({
  tcId: 'MTA-UI-154',
  name: '내 공개 글 더보기에 「인용 가능한 사용자 변경」이 보인다',
  platforms: ['android'],
  precondition: ['내 글 더보기가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 내글관계항목없음 = defineCase({
  tcId: 'MTA-FN-187',
  name: '내 글 더보기를 열면 팔로우 · 뮤트 · 차단 · 신고 항목이 보이지 않는다',
  platforms: ['android'],
  precondition: ['내 글 더보기가 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 남의글메뉴 = defineCase({
  tcId: 'MTA-UI-155',
  name: '글 더보기에 「보관」 · 「공유」 · 「브라우저에서 열기」 · 링크 복사가 보인다',
  platforms: ['android'],
  precondition: ['남의 글이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('두 번째 사용자가 API 로 올릴 글 — 「QA TP018」로 시작하는 500자까지').default('QA TP018 남의 글'),
  }),
  expected: null,
});

const 남의글관계항목 = defineCase({
  tcId: 'MTA-UI-157',
  name: '남의 글 더보기에 「<이름> 팔로우」 · 「<이름> 뮤트」 · 「<이름> 차단」 · 「<이름> 신고」가 보인다',
  platforms: ['android'],
  precondition: ['cafe_moon 의 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 목록항목 = defineCase({
  tcId: 'MTA-UI-156',
  name: '내가 팔로우하는 사람의 글 더보기에 「목록에서 추가 또는 제거」가 보인다',
  platforms: ['android'],
  precondition: ['내가 팔로우하는 news_bot 의 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 번역항목 = defineCase({
  tcId: 'MTA-FN-181',
  name: '기기 언어와 다른 공개 글 더보기를 열면 「영어에서 번역됨」 번역 항목이 보인다',
  platforms: ['android'],
  precondition: ['minjun_dev 의 영어 공개 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 긴이름 = defineCase({
  tcId: 'MTA-FN-189',
  name: '표시 이름이 20자면 남의 글 더보기 항목에 이름이 줄지 않고 다 보인다',
  platforms: ['android'],
  held: '보류 — Test timeout of 120000ms exceeded.',
  precondition: ['표시 이름이 20자인 dn_len20 의 글이 있다', '표시 이름이 21자인 dn_len21 의 글이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({ 줄임표: z.string().describe('줄어든 이름 뒤에 붙는 글자').default('…') }),
});

const 인용제거항목 = defineCase({
  tcId: 'MTA-FN-191',
  name: '남의 글이 내 글을 인용했으면 더보기에 「jiho_cafe의 게시물에서 나의 게시물을 제거합니다」가 보인다',
  platforms: ['android'],
  precondition: ['jiho_cafe 가 내 글을 인용한 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 인용제거항목없음 = defineCase({
  tcId: 'MTA-FN-192',
  name: '내 글을 인용하지 않은 남의 글 더보기를 열면 인용 제거 항목이 보이지 않는다',
  platforms: ['android'],
  precondition: ['cafe_moon 의 글은 내 글을 인용하지 않았다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-018',
  name: '글 더보기 메뉴',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [내글메뉴, 인용변경항목, 내글관계항목없음, 남의글메뉴, 남의글관계항목, 목록항목, 번역항목, 인용제거항목, 인용제거항목없음, 긴이름],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 메뉴 = new 펼친메뉴(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 내글자 = '';
  let 나이름 = '';

  const 내글더보기열기 = async (): Promise<void> => {
    if (await 메뉴.떴나(2_000)) return;
    await 홈에들어가기(driver);
    await 홈에서글찾기(driver, 내글자);
    await 카드.더보기누르기(내글자);
    if (!(await 메뉴.떴나(10_000))) throw new Error('내 글 더보기가 안 열렸다');
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP018');
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP018');
  });

  await test.case(내글메뉴, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    내글자 = params.본문;
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(나!, 'QA TP018');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('API 로 내 글을 올린다', async () => {
      나이름 = 이름(await 내정보(나!));
      await 글쓰기(나!, params.본문);
      await 홈에들어가기(driver);
      await verify('홈 맨 위에 내 글이 보인다', await 홈.새로고침해맨위에올때까지(params.본문), true, { blocker: true });
    });
    await test.step('내 글 더보기를 연다', async () => {
      await 카드.더보기누르기(params.본문);
      const 고정 = await verify('「프로필에 고정」이 보인다', await 메뉴.항목있나('프로필에 고정', 10_000), true);
      const 수정 = await verify('「수정」이 보인다', await 메뉴.항목있나('수정'), true);
      const 삭제 = await verify('「삭제」가 보인다', await 메뉴.항목있나('삭제'), true);
      const 대화뮤트 = await verify('「대화 뮤트하기」가 보인다', await 메뉴.항목있나('대화 뮤트하기'), true);
      await verify('내 글 더보기에 「프로필에 고정」 · 「수정」 · 「삭제」 · 「대화 뮤트하기」가 보인다', 고정 && 수정 && 삭제 && 대화뮤트, true);
    });
  });

  await test.case(인용변경항목, async () => {
    await test.step('내 글 더보기가 열려 있는지 보고 닫혀 있으면 연다', async () => {
      await 내글더보기열기();
    });
    await test.step('「인용 가능한 사용자 변경」 항목을 확인한다', async () => {
      await verify('내 공개 글 더보기에 「인용 가능한 사용자 변경」이 보인다', await 메뉴.항목있나('인용 가능한 사용자 변경'), true);
    });
  });

  await test.case(내글관계항목없음, async () => {
    await test.step('내 글 더보기가 열려 있는지 다시 보고 닫혀 있으면 연다', async () => {
      await 내글더보기열기();
    });
    await test.step('내 글 더보기에서 팔로우 · 뮤트 · 차단 · 신고 항목 자리를 확인한다', async () => {
      const 팔로우 = await verify('팔로우 항목이 보이지 않는다', await 메뉴.일부항목있나(`${나이름} 팔로우`, 1_500), false);
      const 뮤트 = await verify('뮤트 항목이 보이지 않는다', await 메뉴.일부항목있나(`${나이름} 뮤트`, 1_500), false);
      const 차단 = await verify('차단 항목이 보이지 않는다', await 메뉴.일부항목있나(`${나이름} 차단`, 1_500), false);
      const 신고 = await verify('신고 항목이 보이지 않는다', await 메뉴.일부항목있나(`${나이름} 신고`, 1_500), false);
      await verify('내 글 더보기를 열면 팔로우 · 뮤트 · 차단 · 신고 항목이 보이지 않는다', 팔로우 && 뮤트 && 차단 && 신고, true);
      await 메뉴.닫기();
    });
  });

  await test.case(남의글메뉴, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 새 글을 올린다', async () => {
      await 내글지우기(둘째!, 'QA TP018');
      await 글쓰기(둘째!, params.본문);
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.본문);
    });
    await test.step('남의 글 더보기를 연다', async () => {
      await 카드.더보기누르기(params.본문);
      const 보관 = await verify('「보관」이 보인다', await 메뉴.항목있나('보관', 10_000), true);
      const 공유 = await verify('「공유」가 보인다', await 메뉴.항목있나('공유'), true);
      const 브라우저 = await verify('「브라우저에서 열기」가 보인다', await 메뉴.항목있나('브라우저에서 열기'), true);
      const 링크복사 = await verify('링크 복사가 보인다', await 메뉴.항목있나('링크 복사'), true);
      await verify('글 더보기에 「보관」 · 「공유」 · 「브라우저에서 열기」 · 링크 복사가 보인다', 보관 && 공유 && 브라우저 && 링크복사, true);
      await 메뉴.닫기();
    });
  });

  await test.case(남의글관계항목, async () => {
    const 카페글 = await 사람글찾기(나!, 'cafe_moon', (x) => x.reblog === null, 'cafe_moon 글');
    const 카페이름 = 이름(카페글.account);
    await test.step('cafe_moon 프로필에서 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'cafe_moon', 카드글자(카페글));
    });
    await test.step('cafe_moon 글 더보기를 연다', async () => {
      await 더보기열기(driver, 카드글자(카페글));
      const 팔로우 = await verify('「<이름> 팔로우」가 보인다', await 메뉴.항목있나(`${카페이름} 팔로우`), true);
      const 뮤트 = await verify('「<이름> 뮤트」가 보인다', await 메뉴.항목있나(`${카페이름} 뮤트`), true);
      const 차단 = await verify('「<이름> 차단」이 보인다', await 메뉴.항목있나(`${카페이름} 차단`), true);
      const 신고 = await verify('「<이름> 신고」가 보인다', await 메뉴.항목있나(`${카페이름} 신고`), true);
      await verify('남의 글 더보기에 「<이름> 팔로우」 · 「<이름> 뮤트」 · 「<이름> 차단」 · 「<이름> 신고」가 보인다', 팔로우 && 뮤트 && 차단 && 신고, true);
      await 메뉴.닫기();
    });
  });

  await test.case(목록항목, async () => {
    const 뉴스글 = await 사람글찾기(나!, 'news_bot', (x) => x.reblog === null, 'news_bot 글');
    await test.step('news_bot 프로필에서 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'news_bot', 카드글자(뉴스글));
    });
    await test.step('news_bot 글 더보기를 연다', async () => {
      await 더보기열기(driver, 카드글자(뉴스글));
      await verify('내가 팔로우하는 사람의 글 더보기에 「목록에서 추가 또는 제거」가 보인다', await 메뉴.항목있나('목록에서 추가 또는 제거'), true);
      await 메뉴.닫기();
    });
  });

  await test.case(번역항목, async () => {
    const 영어글 = await 사람글찾기(나!, 'minjun_dev', (x) => x.reblog === null && x.language === 'en' && x.visibility === 'public', '영어 공개');
    await test.step('minjun_dev 프로필에서 영어 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(영어글));
    });
    await test.step('영어 글 더보기를 연다', async () => {
      await 더보기열기(driver, 카드글자(영어글));
      await verify('기기 언어와 다른 공개 글 더보기를 열면 「영어에서 번역됨」 번역 항목이 보인다', await 메뉴.항목있나('영어에서 번역됨'), true);
      await 메뉴.닫기();
    });
  });

  await test.case(인용제거항목, async () => {
    const 인용글 = await 사람글찾기(나!, 'jiho_cafe', (x) => x.reblog === null && x.quote?.quoted_status?.account.username === 'qa_user1', '내 글을 인용한');
    await test.step('jiho_cafe 프로필에서 내 글을 인용한 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'jiho_cafe', 카드글자(인용글));
    });
    await test.step('내 글을 인용한 jiho_cafe 글 더보기를 연다', async () => {
      await 더보기열기(driver, 카드글자(인용글));
      await verify(
        '남의 글이 내 글을 인용했으면 더보기에 「jiho_cafe의 게시물에서 나의 게시물을 제거합니다」가 보인다',
        await 메뉴.항목있나('jiho_cafe의 게시물에서 나의 게시물을 제거합니다'),
        true,
      );
      await 메뉴.닫기();
    });
  });

  await test.case(인용제거항목없음, async () => {
    const 카페글 = await 사람글찾기(나!, 'cafe_moon', (x) => x.reblog === null, 'cafe_moon 글');
    await test.step('cafe_moon 프로필에서 인용하지 않은 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'cafe_moon', 카드글자(카페글));
    });
    await test.step('내 글을 인용하지 않은 글 더보기에서 인용 제거 항목 자리를 확인한다', async () => {
      await 더보기열기(driver, 카드글자(카페글));
      await verify('내 글을 인용하지 않은 남의 글 더보기를 열면 인용 제거 항목이 보이지 않는다', await 메뉴.일부항목있나('나의 게시물을 제거합니다', 1_500), false);
      await 메뉴.닫기();
    });
  });

  await test.case(긴이름, async ({ expected }) => {
    const 스무자글 = (await 사람글들(나!, 'dn_len20'))[0];
    const 스물한자글 = (await 사람글들(나!, 'dn_len21'))[0];
    if (스무자글 === undefined || 스물한자글 === undefined) throw new Error('dn_len20 · dn_len21 의 글이 없다');
    const 스무자이름 = 이름(스무자글.account);
    const 스물한자이름 = 이름(스물한자글.account);
    await test.step('dn_len20 프로필에서 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'dn_len20', 카드글자(스무자글));
    });
    await test.step('dn_len20 글 더보기를 연다', async () => {
      await 더보기열기(driver, 카드글자(스무자글));
      await verify('표시 이름이 20자면 남의 글 더보기 항목에 이름이 줄지 않고 다 보인다', await 메뉴.항목있나(`${스무자이름} 팔로우`), true);
      await 메뉴.닫기();
    });
    await test.step('dn_len21 프로필에서 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'dn_len21', 카드글자(스물한자글));
    });
    await test.step('dn_len21 글 더보기를 연다', async () => {
      await 더보기열기(driver, 카드글자(스물한자글));
      const 항목글 = await 메뉴.일부항목글(스물한자이름.slice(0, 15));
      const 줄어듦 = await verify('이름이 15자 뒤에서 잘린다', 항목글.startsWith(`${스물한자이름.slice(0, 15)}${expected.줄임표}`), true);
      const 전체없음 = await verify('이름 전체는 보이지 않는다', 항목글.includes(스물한자이름), false);
      await verify('표시 이름이 21자인 사람의 더보기 항목 이름은 15자 뒤 「…」로 줄어 보인다', 줄어듦 && 전체없음, true);
      await 메뉴.닫기();
    });
  });
});
