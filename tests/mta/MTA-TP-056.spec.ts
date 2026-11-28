import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내정보, 필터만들기, 필터지우기 } from './helpers/api.helper.js';
import { 창에글있나 } from './helpers/flow-profile.helper.js';
import { 만료필터만들기, 안내글보이나, 필터목록열기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 뮤트단어화면, 필터범위화면 } from './pages/filter-words.page.js';
import { 필터목록화면 } from './pages/filters.page.js';
import { 홈화면 } from './pages/home.page.js';

const 필터목록모양 = defineCase({
  tcId: 'MTA-UI-417',
  name: '필터 목록에 필터 줄과 상태 「활성 사용자」 · 「비활성 사용자」, 「필터 추가」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 필터 목록을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    활성: z.string().describe('활성 필터 상태 글자').default('활성 사용자'),
    비활성: z.string().describe('비활성 필터 상태 글자').default('비활성 사용자'),
    추가: z.string().describe('필터 추가 버튼 글자').default('필터 추가'),
  }),
});

const 필터추가화면 = defineCase({
  tcId: 'MTA-UI-418',
  name: '필터 편집 화면 「필터 추가」에 「제목」 · 「기간」 · 「뮤트된 단어」 · 「<범위>를 뮤트」 · 스위치 「내용 경고 표시」와 메뉴 「저장」이 보인다',
  platforms: ['android'],
  precondition: ['필터 목록이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 제목비움 = defineCase({
  tcId: 'MTA-FN-671',
  name: '필터 제목이 비어 있으면 「비워둘 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['필터 추가 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 기간선택지 = defineCase({
  tcId: 'MTA-UI-420',
  name: '필터 기간 선택지에 「무기한」 · 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주 · 「사용자 지정」이 보인다',
  platforms: ['android'],
  precondition: ['필터 추가 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 범위줄임 = defineCase({
  tcId: 'MTA-FN-492',
  name: '필터 범위를 둘 고르면 「홈 & 리스트과 알림」 꼴로 줄여 보인다',
  platforms: ['android'],
  held: '보류 — 필터 편집 범위 줄이 안 보인다',
  precondition: ['필터 추가 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 둘: z.string().describe('범위 둘을 고른 줄인 글').default('홈 & 리스트과 알림') }),
});

const 같은단어다시 = defineCase({
  tcId: 'MTA-FN-673',
  name: '이미 목록에 있는 단어를 더하면 「이미 목록에 있음」이 보인다',
  platforms: ['android'],
  precondition: ['뮤트된 단어 「qa단어」가 있다'],
  params: z.object({ 단어: z.string().min(1).describe('뮤트할 단어').default('qa단어') }),
  expected: z.object({ 안내: z.string().describe('같은 단어를 다시 더할 때 칸 아래 글').default('이미 목록에 있음') }),
});

const 단어지우기묻기 = defineCase({
  tcId: 'MTA-FN-495',
  name: '뮤트된 단어를 골라 지우면 「1 단어를 삭제하시겠습니까?」를 묻는다',
  platforms: ['android'],
  precondition: ['뮤트된 단어 「qa단어」가 있다'],
  params: z.object({ 단어: z.string().min(1).describe('지울 뮤트 단어').default('qa단어') }),
  expected: z.object({ 묻기: z.string().describe('삭제 확인 창 글').default('1 단어를 삭제하시겠습니까?') }),
});

const 단어추가도움말 = defineCase({
  tcId: 'MTA-FN-672',
  name: '「뮤트할 단어 추가」로 단어를 더할 수 있고 「도움말」을 누르면 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」가 보인다',
  platforms: ['android'],
  precondition: ['필터 추가 화면이 열려 있다'],
  params: z.object({ 단어: z.string().min(1).describe('뮤트할 단어').default('qa단어') }),
  expected: z.object({ 도움말: z.string().describe('도움말 첫 문장').default('단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.') }),
});

const 필터삭제묻기 = defineCase({
  tcId: 'MTA-FN-674',
  name: '필터 삭제를 누르면 「“QA필터” 필터를 삭제하시겠습니까?」 / 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」를 묻는다',
  platforms: ['android'],
  precondition: ['필터 「QA필터」가 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('삭제 확인 창 제목').default('“QA필터” 필터를 삭제하시겠습니까?'),
    안내: z.string().describe('삭제 확인 창 안내').default('이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.'),
  }),
});

const 나가기묻기 = defineCase({
  tcId: 'MTA-FN-675',
  name: '필터 편집에서 고친 뒤 저장 없이 나가면 「변경 사항을 지우시겠습니까?」를 묻는다',
  platforms: ['android'],
  precondition: ['필터 「QA필터」 편집 화면에서 제목을 고쳤다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('나가기 확인 창 안내').default('변경 사항을 지우시겠습니까?') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-056',
  name: '필터 — 목록과 편집 화면',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [필터목록모양, 필터추가화면, 제목비움, 기간선택지, 같은단어다시, 단어지우기묻기, 단어추가도움말, 필터삭제묻기, 나가기묻기, 범위줄임],
});

const 활성제목 = 'QA TP056 활성필터';
const 비활성제목 = 'QA TP056 비활성필터';
const 지울필터 = 'QA필터';

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 필터목록화면(driver);
  const 편집 = new 필터편집화면(driver);
  const 범위 = new 필터범위화면(driver);
  const 단어 = new 뮤트단어화면(driver);
  let 나: 계정 | undefined;
  let 나사용자명 = '';

  const 추가화면열기 = async (): Promise<void> => {
    await 필터목록열기(driver, 나사용자명);
    await 목록.추가누르기();
    if (!(await 편집.추가화면떴나(15_000))) throw new Error('필터 추가 화면이 안 열렸다');
  };

  const 지울필터편집열기 = async (): Promise<void> => {
    await 필터목록열기(driver, 나사용자명);
    await 목록.줄누르기(지울필터);
    if (!(await 편집.제목칸있나(15_000))) throw new Error('필터 편집 화면이 안 열렸다');
  };

  await test.cleanup('이 흐름이 만든 필터를 지운다', async () => {
    if (나 === undefined) return;
    await 필터지우기(나, 'QA TP056');
    await 필터지우기(나, 지울필터);
  });

  await test.case(필터목록모양, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      나사용자명 = (await 내정보(나!)).username;
      await 필터지우기(나!, 'QA TP056');
      await 필터지우기(나!, 지울필터);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('API 로 활성 필터와 만료된 필터를 만들고 필터 목록을 연다', async () => {
      await 필터만들기(나!, 활성제목, ['qa단어']);
      await 만료필터만들기(나!, 비활성제목);
      await 필터목록열기(driver, 나사용자명);
    });
    await test.step('필터 목록을 확인한다', async () => {
      const 활성줄 = await verify('필터 줄이 보인다', await 목록.줄있나(활성제목, 10_000), true);
      const 활성 = await verify('활성 필터 상태가 「활성 사용자」다', await 목록.줄상태(활성제목), expected.활성);
      const 비활성 = await verify('만료된 필터 상태가 「비활성 사용자」다', await 목록.줄상태(비활성제목), expected.비활성);
      const 추가 = await verify('「필터 추가」가 보인다', await 목록.추가버튼글(), expected.추가);
      await verify('필터 목록에 필터 줄과 상태 「활성 사용자」 · 「비활성 사용자」, 「필터 추가」가 보인다', 활성줄 && 활성 && 비활성 && 추가, true);
    });
  });

  await test.case(필터추가화면, async () => {
    await test.step('필터 목록이 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 목록.떴나(2_000))) await 필터목록열기(driver, 나사용자명);
    });
    await test.step('「필터 추가」를 누른다', async () => {
      await 목록.추가누르기();
      const 제목칸 = await verify('「제목」 칸이 보인다', await 편집.제목칸있나(), true);
      const 기간 = await verify('「기간」이 보인다', await 편집.줄있나('기간'), true);
      const 단어 = await verify('「뮤트된 단어」가 보인다', await 편집.줄있나('뮤트된 단어'), true);
      const 범위 = await verify('「<범위>를 뮤트」가 보인다', await 편집.범위줄있나(), true);
      const 경고 = await verify('스위치 「내용 경고 표시」가 보인다', await 편집.줄있나('내용 경고 표시'), true);
      const 저장 = await verify('메뉴 「저장」이 보인다', await 편집.저장있나(), true);
      await verify(
        '필터 편집 화면 「필터 추가」에 「제목」 · 「기간」 · 「뮤트된 단어」 · 「<범위>를 뮤트」 · 스위치 「내용 경고 표시」와 메뉴 「저장」이 보인다',
        제목칸 && 기간 && 단어 && 범위 && 경고 && 저장,
        true,
      );
    });
  });

  await test.case(제목비움, async () => {
    await test.step('필터 추가 화면이 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 편집.추가화면떴나(2_000))) await 추가화면열기();
    });
    await test.step('제목을 비운 채 「저장」을 누른다', async () => {
      await 편집.저장누르기();
      await verify('필터 제목이 비어 있으면 「비워둘 수 없습니다」가 보인다', await 안내글보이나(driver, '비워둘 수 없습니다'), true);
    });
  });

  await test.case(기간선택지, async () => {
    await test.step('필터 추가 화면을 다시 연다', async () => {
      await 추가화면열기();
    });
    await test.step('「기간」을 누른다', async () => {
      await 편집.기간누르기();
      await 편집.기간창떴나();
      const 선택지 = await 편집.기간선택지();
      const 무기한 = await verify('「무기한」이 보인다', 선택지.includes('무기한'), true);
      const 삼십분 = await verify('30분이 보인다', 선택지.includes('30분'), true);
      const 한시간 = await verify('1시간이 보인다', 선택지.includes('1시간'), true);
      const 열두시간 = await verify('12시간이 보인다', 선택지.includes('12시간'), true);
      const 하루 = await verify('1일이 보인다', 선택지.includes('1일'), true);
      const 사흘 = await verify('3일이 보인다', 선택지.includes('3일'), true);
      const 한주 = await verify('1 주가 보인다', 선택지.includes('1 주'), true);
      const 사용자지정 = await verify('「사용자 지정」이 보인다', 선택지.includes('사용자 지정'), true);
      await verify(
        '필터 기간 선택지에 「무기한」 · 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주 · 「사용자 지정」이 보인다',
        무기한 && 삼십분 && 한시간 && 열두시간 && 하루 && 사흘 && 한주 && 사용자지정,
        true,
      );
      await 편집.뒤로가기누르기();
    });
  });

  await test.case(같은단어다시, async ({ params, expected }) => {
    await test.step('뮤트된 단어 화면에 「qa단어」를 더해 둔다', async () => {
      await 편집.뮤트단어누르기();
      if (!(await 단어.떴나())) throw new Error('뮤트된 단어 화면이 안 열렸다');
      await 단어.단어더하기(params.단어);
    });
    await test.step('같은 「qa단어」를 다시 더한다', async () => {
      await 단어.단어추가창열기();
      await 단어.창에적기(params.단어);
      await 단어.창추가누르기();
      await verify('이미 목록에 있는 단어를 더하면 「이미 목록에 있음」이 보인다', await 단어.창에글있나(expected.안내), true);
      await 단어.창취소누르기();
    });
  });

  await test.case(단어지우기묻기, async ({ params, expected }) => {
    await test.step('단어를 골라 지운다', async () => {
      if (!(await 단어.단어줄있나(params.단어))) throw new Error(`뮤트된 단어 「${params.단어}」 줄이 없다`);
      await 단어.선택모드켜기();
      await 단어.단어고르기(params.단어);
      await 단어.삭제누르기();
      const 창 = 단어.삭제확인창();
      await verify('뮤트된 단어를 골라 지우면 「1 단어를 삭제하시겠습니까?」를 묻는다', await 창에글있나(창, expected.묻기), true);
      await 창.취소누르기();
      await 단어.닫기();
    });
  });

  await test.case(단어추가도움말, async ({ params, expected }) => {
    await test.step('필터 추가 화면을 새로 연다', async () => {
      await 단어.닫기();
      await 편집.뒤로가기누르기();
      const 나가기 = 편집.나가기확인창();
      if (await 나가기.떴나(3_000)) await 나가기.확인누르기();
      await 추가화면열기();
    });
    await test.step('「뮤트할 단어 추가」로 「qa단어」를 더하고 「도움말」을 누른다', async () => {
      await 편집.뮤트단어누르기();
      if (!(await 단어.떴나())) throw new Error('뮤트된 단어 화면이 안 열렸다');
      await 단어.단어추가창열기();
      await 단어.창에적기(params.단어);
      await 단어.도움말누르기();
      const 도움말 = await verify('도움말 첫 문장이 보인다', (await 단어.도움말글()).startsWith(expected.도움말), true);
      await 단어.창추가누르기();
      const 더함 = await verify('「뮤트할 단어 추가」로 더한 단어 줄이 보인다', await 단어.단어줄있나(params.단어), true);
      await verify('「뮤트할 단어 추가」로 단어를 더할 수 있고 「도움말」을 누르면 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」가 보인다', 도움말 && 더함, true);
      await 단어.닫기();
      await 편집.뒤로가기누르기();
      const 나가기 = 편집.나가기확인창();
      if (await 나가기.떴나(3_000)) await 나가기.확인누르기();
    });
  });

  await test.case(필터삭제묻기, async ({ expected }) => {
    await test.step('API 로 필터 「QA필터」를 만들고 편집 화면을 연다', async () => {
      await 필터만들기(나!, 지울필터, ['qa삭제단어']);
      await 지울필터편집열기();
    });
    await test.step('필터 편집에서 「필터 삭제」를 누른다', async () => {
      await 편집.삭제누르기();
      const 창 = 편집.삭제확인창();
      const 제목 = await verify('확인 창에 「“QA필터” 필터를 삭제하시겠습니까?」가 보인다', (await 창.제목글()).includes(expected.제목) || (await 창.글읽기()).includes(expected.제목), true);
      const 안내 = await verify('확인 창에 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」가 보인다', (await 창.글읽기()).includes(expected.안내), true);
      await verify(
        '필터 삭제를 누르면 「“QA필터” 필터를 삭제하시겠습니까?」 / 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」를 묻는다',
        제목 && 안내,
        true,
      );
      await 창.취소누르기();
    });
  });

  await test.case(나가기묻기, async ({ expected }) => {
    await test.step('필터 「QA필터」 편집 화면에서 제목을 고친다', async () => {
      await 지울필터편집열기();
      await 편집.제목적기(`${지울필터} 고침`);
    });
    await test.step('저장하지 않고 뒤로 가기를 누른다', async () => {
      await 편집.뒤로가기누르기();
      const 창 = 편집.나가기확인창();
      await verify('필터 편집에서 고친 뒤 저장 없이 나가면 「변경 사항을 지우시겠습니까?」를 묻는다', (await 창.제목글()).includes(expected.안내) || (await 창.글읽기()).includes(expected.안내), true);
      await 창.확인누르기();
    });
  });

  await test.case(범위줄임, async ({ expected }) => {
    await test.step('범위에서 「홈 & 리스트」 · 「알림」 둘을 고른다', async () => {
      await 추가화면열기();
      await 편집.범위누르기();
      if (!(await 범위.떴나())) throw new Error('필터 범위 화면이 안 열렸다');
      for (const 줄 of ['공개 타임라인', '스레드 & 답글', '프로필']) await 범위.항목누르기(줄);
      await 범위.닫기();
      await verify('필터 범위를 둘 고르면 「홈 & 리스트과 알림」 꼴로 줄여 보인다', await 편집.범위글(), expected.둘);
    });
    await test.step('범위에서 셋을 고른다', async () => {
      await 편집.범위누르기();
      if (!(await 범위.떴나())) throw new Error('필터 범위 화면이 안 열렸다');
      await 범위.항목누르기('공개 타임라인');
      await 범위.닫기();
      await verify('필터 범위 셋은 「A, B, 및 C」 꼴로 줄여 보인다', /^[^,]+, [^,]+, 및 [^,]+$/.test(await 편집.범위글()), true);
    });
    await test.step('범위에서 다섯을 고른다', async () => {
      await 편집.범위누르기();
      if (!(await 범위.떴나())) throw new Error('필터 범위 화면이 안 열렸다');
      for (const 줄 of ['스레드 & 답글', '프로필']) await 범위.항목누르기(줄);
      await 범위.닫기();
      await verify('필터 범위 넷 넘게는 「A, B 및 n개 더보기」 꼴로 줄여 보인다', /^[^,]+, [^,]+ 및 \d+개 더보기$/.test(await 편집.범위글()), true);
    });
  });
});
