import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 글고치기, 글쓰기, 글지우기, 내글지우기, 좋아요, 필터만들기, 필터지우기 } from './helpers/api.helper.js';
import { 글상세열기, 화면글자포함누르기, 화면글자포함있나 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

const 수정요약둘 = defineCase({
  tcId: 'MTA-UI-244',
  name: '변경이 둘 이상이면 수정 기록 요약이 「게시물 수정함」으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 본문과 내용 경고를 함께 고친 내 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP029」로 시작하는 500자까지').default('QA TP029 수정 전 본문'),
  }),
  expected: null,
});

const 필터된답글 = defineCase({
  tcId: 'MTA-FN-287',
  name: '필터 「스레드 & 답글」 범위 낱말이 든 답글은 글 상세를 열면 보이지 않는다',
  platforms: ['android'],
  precondition: ['「스레드 & 답글」 범위 숨기기 필터 「qa답글필터」를 만들었고 그 낱말이 든 답글이 내 글에 달렸다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP029」로 시작하는 500자까지').default('QA TP029 답글을 받는 글'),
    필터낱말: z.string().min(1).max(30).describe('숨길 답글에 넣을 낱말 — 필터 제목 · 낱말로 같이 쓴다').default('qa답글필터'),
  }),
  expected: null,
});

const 삭제된글새로고침 = defineCase({
  tcId: 'MTA-FN-300',
  name: '삭제된 글 상세를 다시 불러오면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['내가 쓴 글 상세를 열어 두었고 그 글을 서버에서 지웠다'],
  techniques: ['동등 분할'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP029」로 시작하는 500자까지').default('QA TP029 지울 글'),
  }),
  expected: z.object({ 안내: z.string().describe('없는 글 안내').default('삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.') }),
});

const 삭제된글좋아요목록 = defineCase({
  tcId: 'MTA-FN-573',
  name: '없는 글의 좋아요한 사람 목록을 열면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['내가 쓴 글 상세를 열어 두었고 그 글을 서버에서 지웠다'],
  techniques: ['동등 분할'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP029」로 시작하는 500자까지').default('QA TP029 좋아요를 받고 지울 글'),
  }),
  expected: z.object({ 안내: z.string().describe('없는 글 안내').default('삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.') }),
});

const 통신오류재시도 = defineCase({
  tcId: 'MTA-FN-575',
  name: '통신 오류가 나면 목록 오류 화면에 「재시도」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['홈이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 서버오류안내 = defineCase({
  tcId: 'MTA-FN-694',
  name: '서버 오류(5xx)면 「서버와의 통신에 문제가 발생하였습니다. 회원님의 잘못은 아닐 것입니다. 재시도해주시겠어요?」가 보인다',
  platforms: ['android'],
  precondition: ['서버가 5xx 를 돌려주는 상태다'],
  techniques: ['동등 분할'],
  held: '보류 — 대상 서버가 5xx 를 돌려주게 만들 길이 없다',
  params: z.object({}),
  expected: z.object({
    안내: z
      .string()
      .describe('서버 오류 안내')
      .default('서버와의 통신에 문제가 발생하였습니다. 회원님의 잘못은 아닐 것입니다. 재시도해주시겠어요?'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-029',
  name: '글 상세 — 수정 · 필터 · 없는 글',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [수정요약둘, 필터된답글, 삭제된글새로고침, 삭제된글좋아요목록, 통신오류재시도, 서버오류안내],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 상세 = new 글상세화면(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 글과 필터를 지운다', async () => {
    if (나 !== undefined) {
      await 내글지우기(나, 'QA TP029');
      await 필터지우기(나, 'QA TP029');
    }
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP029');
  });

  await test.case(수정요약둘, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(나!, 'QA TP029');
      await 필터지우기(나!, 'QA TP029');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('API 로 내 글의 본문과 내용 경고를 함께 고치고 글 상세를 연다', async () => {
      const 올린글 = await 글쓰기(나!, params.본문);
      await 글고치기(나!, 올린글.id, 'QA TP029 수정 후 본문', { spoiler_text: 'QA TP029 경고' });
      await 홈에들어가기(driver);
      await 글상세열기(driver, 올린글.url);
      await verify('내 글 상세의 푸터가 보인다', await 상세.푸터까지내리기(), true, { blocker: true });
    });
    await test.step('두 가지를 고친 글의 수정 내역을 연다', async () => {
      await 화면글자포함누르기(driver, '마지막 수정');
      await verify('변경이 둘 이상이면 수정 기록 요약이 「게시물 수정함」으로 보인다', await 화면글자포함있나(driver, '게시물 수정함', 10_000), true);
    });
  });

  await test.case(필터된답글, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    const 답글자 = `QA TP029 ${params.필터낱말} 답글`;
    const 정상답글자 = 'QA TP029 정상 답글';
    let 글주소: string | null = null;
    await test.step('API 로 「스레드 & 답글」 숨기기 필터와 그 낱말이 든 답글을 만든다', async () => {
      await 필터만들기(나!, `QA TP029 ${params.필터낱말}`, [params.필터낱말], ['thread'], 'hide');
      const 올린글 = await 글쓰기(나!, params.본문);
      글주소 = 올린글.url;
      await 글쓰기(둘째!, 답글자, { in_reply_to_id: 올린글.id });
      await 글쓰기(둘째!, 정상답글자, { in_reply_to_id: 올린글.id });
      await 홈에들어가기(driver);
    });
    await test.step('필터 낱말이 든 답글이 달린 내 글 상세를 연다', async () => {
      await 글상세열기(driver, 글주소);
      await 될때까지(driver, () => 카드.보이나(정상답글자), 30_000);
      await verify('필터 「스레드 & 답글」 범위 낱말이 든 답글은 글 상세를 열면 보이지 않는다', await 카드.보이나(답글자), false);
    });
  });

  await test.case(삭제된글새로고침, async ({ params, expected }) => {
    let 올린글id = '';
    await test.step('API 로 내 글을 올리고 그 글 상세를 열어 둔다', async () => {
      const 올린글 = await 글쓰기(나!, params.본문);
      올린글id = 올린글.id;
      await 홈에들어가기(driver);
      await 글상세열기(driver, 올린글.url);
    });
    await test.step('서버에서 그 글을 지운다', async () => {
      await 글지우기(나!, 올린글id);
    });
    await test.step('지워진 글 상세를 당겨서 새로고침한다', async () => {
      const 보임 = await 될때까지(
        driver,
        async () => {
          await 상세.당겨서새로고침();
          return 화면글자포함있나(driver, expected.안내, 5_000);
        },
        40_000,
      );
      await verify('삭제된 글 상세를 다시 불러오면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', 보임 ? await 상세.오류글읽기() : '', expected.안내);
    });
  });

  await test.case(삭제된글좋아요목록, async ({ params, expected }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    const 목록 = new 계정목록화면(driver);
    let 올린글id = '';
    await test.step('API 로 내 글을 올리고 좋아요를 받은 뒤 그 글 상세를 열어 둔다', async () => {
      const 올린글 = await 글쓰기(나!, params.본문);
      올린글id = 올린글.id;
      await 좋아요(둘째!, 올린글.id);
      await 홈에들어가기(driver);
      await 글상세열기(driver, 올린글.url);
      await verify('내 글 상세의 푸터가 보인다', await 상세.푸터까지내리기(), true, { blocker: true });
    });
    await test.step('서버에서 좋아요를 받은 그 글을 지운다', async () => {
      await 글지우기(나!, 올린글id);
    });
    await test.step('지워진 글 상세에서 좋아요 수를 누른다', async () => {
      await 상세.좋아요수누르기();
      await verify('없는 글의 좋아요한 사람 목록을 열면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', await 목록.오류글읽기(), expected.안내);
      await 목록.뒤로();
    });
  });

  await test.case(통신오류재시도, async () => {
    await test.step('홈을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('통신을 끊은 채 홈을 당겨서 새로고침한다', async () => {
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 홈.당겨서새로고침();
        await verify('통신 오류가 나면 목록 오류 화면에 「재시도」 버튼이 보인다', await 홈.오류재시도있나(20_000), true);
      });
    });
  });

  await test.case(서버오류안내, async ({ expected }) => {
    await test.step('서버 오류가 난 목록을 연다', async () => {
      await 홈에들어가기(driver);
      await 홈.당겨서새로고침();
      await verify('서버 오류(5xx)면 「서버와의 통신에 문제가 발생하였습니다. 회원님의 잘못은 아닐 것입니다. 재시도해주시겠어요?」가 보인다', await 홈.오류글읽기(), expected.안내);
    });
  });
});
