import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { type 계정, type 글, 계정꺼내기, 글쓰기, 내글지우기, 부스트, 사람글들, 사람글찾기, 좋아요 } from './helpers/api.helper.js';
import {
  글상세에서앞이위인가,
  글상세열기,
  이름,
  카드글자,
  프로필열고글찾기,
  화면글자포함누르기,
  화면글자포함읽기,
  화면글자포함있나,
} from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 수정내역화면 } from './pages/edit-history.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 인용목록화면 } from './pages/quotes.page.js';
import { 글상세화면 } from './pages/thread.page.js';

const 글타래열기 = defineCase({
  tcId: 'MTA-FN-284',
  name: '글 본문을 누르면 제목 「seoyeon_books 님의 게시물」 글 상세가 열리고 앞선 글이 위에, 답글이 아래에 이어진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 seoyeon_books 의 글타래가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 제목: z.string().describe('글 상세 제목').default('seoyeon_books 님의 게시물') }),
});

const 답장막대 = defineCase({
  tcId: 'MTA-UI-231',
  name: '글 상세 하단 답장 막대에 「<이름>님에게 답장하기」가 보인다',
  platforms: ['android'],
  precondition: ['글 상세가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 확장푸터 = defineCase({
  tcId: 'MTA-UI-234',
  name: '글 상세 확장 푸터에 시간 · 날짜 · 「n개의 좋아요」 · 「n 님이 부스트했습니다」 · 「n 인용함」이 보인다',
  platforms: ['android'],
  precondition: ['글 상세가 열려 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP028」로 시작하는 500자까지').default('QA TP028 푸터 글'),
  }),
  expected: null,
});

const 푸터사람목록 = defineCase({
  tcId: 'MTA-FN-290',
  name: '확장 푸터 좋아요 수를 누르면 좋아요한 사람 목록이 열린다',
  platforms: ['android'],
  precondition: ['좋아요와 부스트가 있는 내 글 상세가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 인용수목록 = defineCase({
  tcId: 'MTA-FN-291',
  name: '확장 푸터 인용 수를 누르면 제목 「n 인용함」 인용 글 목록이 열린다',
  platforms: ['android'],
  precondition: ['jiho_cafe 가 인용한 내 글 상세가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 마지막수정 = defineCase({
  tcId: 'MTA-UI-235',
  name: '수정된 글 확장 푸터에 「마지막 수정: <시간>」이 보인다',
  platforms: ['android'],
  precondition: ['minjun_dev 의 수정된 글 상세가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 수정내역열기 = defineCase({
  tcId: 'MTA-FN-292',
  name: '확장 푸터 「마지막 수정」을 누르면 제목 「수정 내역」 수정 기록이 열린다',
  platforms: ['android'],
  precondition: ['수정된 글 상세가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 제목: z.string().describe('수정 기록 제목').default('수정 내역') }),
});

const 수정요약 = defineCase({
  tcId: 'MTA-UI-243',
  name: '수정 기록 첫 버전에 「원본 게시물」이 보이고 이후 버전에 「내용을 수정함」 같은 요약이 붙는다',
  platforms: ['android'],
  precondition: ['수정 내역이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 새답글 = defineCase({
  tcId: 'MTA-FN-286',
  name: '새 답글이 있으면 「More replies found」와 「표시」가 보인다',
  platforms: ['android'],
  precondition: ['내 글 상세를 연 뒤 두 번째 사용자가 그 글에 답글을 달았다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP028」로 시작하는 500자까지').default('QA TP028 답글 받을 글'),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-028',
  name: '글 상세',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [글타래열기, 답장막대, 확장푸터, 푸터사람목록, 인용수목록, 마지막수정, 수정내역열기, 수정요약, 새답글],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 상세 = new 글상세화면(driver);
  const 수정내역 = new 수정내역화면(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 가운데: 글 | undefined;
  let 글타래앞: 글 | undefined;
  let 글타래뒤: 글 | undefined;
  let 내푸터글: 글 | undefined;
  let 수정글: 글 | undefined;
  let 둘째사용자명 = '';

  const 글타래가운데열기 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await 프로필열고글찾기(driver, 'seoyeon_books', 카드글자(가운데!));
    await 카드.본문왼쪽끝누르기(카드글자(가운데!));
    if (!(await 상세.떴나(15_000))) throw new Error('글 상세가 안 열렸다');
  };

  const 수정글상세열기 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await 글상세열기(driver, 수정글!.url);
    await 상세.푸터까지내리기();
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP028');
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP028');
  });

  await test.case(글타래열기, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    const 글들 = await 사람글들(나, 'seoyeon_books');
    가운데 = 글들.find((x) => x.reblog === null && x.in_reply_to_id !== null && 글들.some((y) => y.in_reply_to_id === x.id));
    if (가운데 === undefined) throw new Error('seoyeon_books 의 글 가운데 「글타래 가운데」 글이 없다');
    const 가운데id = 가운데.id;
    글타래앞 = 글들.find((x) => x.id === 가운데!.in_reply_to_id);
    글타래뒤 = 글들.find((y) => y.in_reply_to_id === 가운데id);
    if (글타래앞 === undefined || 글타래뒤 === undefined) throw new Error('seoyeon_books 글타래의 앞 글 · 뒤 글을 못 찾았다');
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('seoyeon_books 프로필에서 글타래 가운데 글 카드를 연다', async () => {
      await 프로필열고글찾기(driver, 'seoyeon_books', 카드글자(가운데!));
    });
    await test.step('글타래 가운데 글 본문을 누른다', async () => {
      await 카드.본문왼쪽끝누르기(카드글자(가운데!));
      const 열림 = await verify('글 상세가 열린다', await 상세.떴나(15_000), true);
      const 제목 = await verify('글 상세 제목이 기대값과 같다', await 상세.제목(), expected.제목);
      const 앞위 = await verify('앞선 글이 위에 이어진다', await 글상세에서앞이위인가(driver, 카드글자(글타래앞!), 카드글자(가운데!)), true);
      const 뒤아래 = await verify('답글이 아래에 이어진다', await 글상세에서앞이위인가(driver, 카드글자(가운데!), 카드글자(글타래뒤!)), true);
      await verify(
        '글 본문을 누르면 제목 「seoyeon_books 님의 게시물」 글 상세가 열리고 앞선 글이 위에, 답글이 아래에 이어진다',
        열림 && 제목 && 앞위 && 뒤아래,
        true,
      );
    });
  });

  await test.case(답장막대, async () => {
    await test.step('글 상세가 열려 있는지 보고 닫혀 있으면 글타래를 다시 연다', async () => {
      if (!(await 상세.떴나(2_000))) await 글타래가운데열기();
    });
    await test.step('글 상세 아래 답장 막대를 확인한다', async () => {
      await verify('글 상세 하단 답장 막대에 「<이름>님에게 답장하기」가 보인다', await 상세.답장막대글읽기(), `${이름(가운데!.account)}님에게 답장하기`);
    });
  });

  await test.case(확장푸터, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('API 로 내 글을 올리고 두 번째 사용자가 좋아요 · 부스트 · 인용한다', async () => {
      await 내글지우기(나!, 'QA TP028');
      await 내글지우기(둘째!, 'QA TP028');
      내푸터글 = await 글쓰기(나!, params.본문);
      await 좋아요(둘째!, 내푸터글.id);
      await 부스트(둘째!, 내푸터글.id);
      const 인용 = await 글쓰기(둘째!, 'QA TP028 인용 글', { quoted_status_id: 내푸터글.id });
      둘째사용자명 = 인용.account.username;
      await 홈에들어가기(driver);
      await 글상세열기(driver, 내푸터글.url);
      await verify('내 글 상세의 푸터가 보인다', await 상세.푸터까지내리기(), true, { blocker: true });
    });
    await test.step('확장 푸터를 확인한다', async () => {
      const 시간 = await verify('확장 푸터에 시간이 보인다', (await 상세.시간글()) !== '', true);
      const 날짜 = await verify('확장 푸터에 날짜가 보인다', (await 상세.날짜글()) !== '', true);
      const 좋아요수 = await verify('확장 푸터에 「n개의 좋아요」가 보인다', /\d+개의 좋아요/.test(await 상세.좋아요수글()), true);
      const 부스트수 = await verify('확장 푸터에 「n 님이 부스트했습니다」가 보인다', /\d+ 님이 부스트했습니다/.test(await 상세.부스트수글()), true);
      const 인용수 = await verify('확장 푸터에 「n 인용함」이 보인다', /\d+ 인용함/.test(await 상세.인용수글()), true);
      await verify('글 상세 확장 푸터에 시간 · 날짜 · 「n개의 좋아요」 · 「n 님이 부스트했습니다」 · 「n 인용함」이 보인다', 시간 && 날짜 && 좋아요수 && 부스트수 && 인용수, true);
    });
  });

  await test.case(푸터사람목록, async () => {
    const 목록 = new 계정목록화면(driver);
    await test.step('내 글 상세가 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 상세.푸터있나())) {
        await 홈에들어가기(driver);
        await 글상세열기(driver, 내푸터글!.url);
        await 상세.푸터까지내리기();
      }
    });
    await test.step('확장 푸터의 좋아요 수를 누른다', async () => {
      await 상세.좋아요수누르기();
      const 열림 = await verify('사람 목록이 열린다', await 목록.떴나(), true);
      const 사람 = await verify('좋아요한 두 번째 사용자가 목록에 있다', await 목록.계정있나(둘째사용자명), true);
      await verify('확장 푸터 좋아요 수를 누르면 좋아요한 사람 목록이 열린다', 열림 && 사람, true);
      await 목록.뒤로();
    });
    await test.step('확장 푸터의 부스트 수를 누른다', async () => {
      await 상세.푸터까지내리기();
      await 상세.부스트수누르기();
      const 열림 = await verify('사람 목록이 열린다', await 목록.떴나(), true);
      const 사람 = await verify('부스트한 두 번째 사용자가 목록에 있다', await 목록.계정있나(둘째사용자명), true);
      await verify('확장 푸터 부스트 수로는 부스트한 사람 목록이 열린다', 열림 && 사람, true);
      await 목록.뒤로();
    });
  });

  await test.case(인용수목록, async () => {
    const 인용글 = await 사람글찾기(나!, 'jiho_cafe', (x) => x.reblog === null && x.quote?.quoted_status?.account.username === 'qa_user1', '내 글을 인용한');
    const 인용된글 = 인용글.quote!.quoted_status!;
    const 인용목록 = new 인용목록화면(driver);
    await test.step('jiho_cafe 가 인용한 내 글 상세를 연다', async () => {
      await 홈에들어가기(driver);
      await 글상세열기(driver, 인용된글.url);
      await verify('내 글 상세의 푸터가 보인다', await 상세.푸터까지내리기(), true, { blocker: true });
    });
    await test.step('확장 푸터의 인용 수를 누른다', async () => {
      await 상세.인용수누르기();
      const 열림 = await verify('인용 글 목록이 열린다', await 인용목록.떴나(), true);
      const 제목 = await verify('인용 글 목록 제목이 「n 인용함」이다', /^\d+ 인용함$/.test(await 인용목록.제목글()), true);
      await verify('확장 푸터 인용 수를 누르면 제목 「n 인용함」 인용 글 목록이 열린다', 열림 && 제목, true);
    });
  });

  await test.case(마지막수정, async () => {
    await test.step('minjun_dev 의 수정된 글 상세를 연다', async () => {
      수정글 = await 사람글찾기(나!, 'minjun_dev', (x) => x.reblog === null && Boolean(x.edited_at), '수정된');
      await 수정글상세열기();
    });
    await test.step('수정된 글의 확장 푸터를 확인한다', async () => {
      const 줄 = await 화면글자포함읽기(driver, '마지막 수정');
      await verify('수정된 글 확장 푸터에 「마지막 수정: <시간>」이 보인다', /^마지막 수정: .+/.test(줄), true);
    });
  });

  await test.case(수정내역열기, async ({ expected }) => {
    await test.step('수정된 글 상세가 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 화면글자포함있나(driver, '마지막 수정', 2_000))) await 수정글상세열기();
    });
    await test.step('확장 푸터의 「마지막 수정」을 누른다', async () => {
      await 화면글자포함누르기(driver, '마지막 수정');
      const 열림 = await verify('수정 기록이 열린다', await 수정내역.떴나(), true);
      const 제목 = await verify('수정 기록 제목이 기대값과 같다', await 수정내역.제목글(), expected.제목);
      await verify('확장 푸터 「마지막 수정」을 누르면 제목 「수정 내역」 수정 기록이 열린다', 열림 && 제목, true);
    });
  });

  await test.case(수정요약, async () => {
    await test.step('수정 내역이 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 수정내역.떴나(2_000))) {
        await 수정글상세열기();
        await 화면글자포함누르기(driver, '마지막 수정');
        if (!(await 수정내역.떴나(10_000))) throw new Error('수정 내역이 안 열렸다');
      }
    });
    await test.step('수정 기록 요약을 확인한다', async () => {
      const 원본 = await verify('첫 버전에 「원본 게시물」이 보인다', await 화면글자포함있나(driver, '원본 게시물'), true);
      const 수정함 = await verify('이후 버전에 「내용을 수정함」이 보인다', await 화면글자포함있나(driver, '내용을 수정함'), true);
      await verify('수정 기록 첫 버전에 「원본 게시물」이 보이고 이후 버전에 「내용을 수정함」 같은 요약이 붙는다', 원본 && 수정함, true);
    });
  });

  await test.case(새답글, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    let 올린글: 글 | undefined;
    await test.step('API 로 내 글을 올리고 그 글 상세를 연다', async () => {
      올린글 = await 글쓰기(나!, params.본문);
      await 홈에들어가기(driver);
      await 글상세열기(driver, 올린글.url);
    });
    await test.step('두 번째 사용자가 API 로 내 글에 답글을 단다', async () => {
      await 글쓰기(둘째!, 'QA TP028 새 답글', { in_reply_to_id: 올린글!.id });
    });
    await test.step('답글이 달린 내 글 상세를 당겨서 새로고침한다', async () => {
      const 보임 = await 될때까지(
        driver,
        async () => {
          await 상세.당겨서새로고침();
          return 화면글자포함있나(driver, 'More replies found', 5_000);
        },
        45_000,
      );
      const 안내 = await verify('「More replies found」가 보인다', 보임, true);
      const 표시 = await verify('「표시」가 보인다', await 화면글자포함있나(driver, '표시'), true);
      await verify('새 답글이 있으면 「More replies found」와 「표시」가 보인다', 안내 && 표시, true);
    });
  });
});
