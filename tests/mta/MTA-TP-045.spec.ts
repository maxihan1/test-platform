import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { type 계정, 계정꺼내기 } from './helpers/api.helper.js';
import {
  type 프로필원본,
  소개해시태그QA지우기,
  소개해시태그맞추기,
  창에글있나,
  프로필되돌리기,
  프로필원본읽기,
  프로필편집으로,
  프로필항목맞추기,
} from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 길이글 } from './helpers/test-data.helper.js';
import { 추천해시태그화면 } from './pages/featured-hashtags.page.js';
import { 항목목록화면, 항목편집화면 } from './pages/field-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 이름편집화면 } from './pages/name-edit.page.js';
import { 탭설정화면 } from './pages/tab-settings.page.js';

const 항목순서 = defineCase({
  tcId: 'MTA-FN-412',
  name: '프로필 항목을 끌면 항목 순서가 바뀐다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정에 프로필 항목이 2개 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: null,
});

const 라벨글자수 = defineCase({
  tcId: 'MTA-FN-655',
  name: '「라벨」에 255자를 적고 저장하면 그 항목이 저장된다',
  platforms: ['android'],
  precondition: ['「Add field」 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안글자수: z.number().int().min(3).max(255).describe('라벨에 적을 글자 수 — 한도 이하').default(255),
    밖글자수: z.number().int().min(256).max(300).describe('라벨에 적을 글자 수 — 한도 초과').default(256),
  }),
  expected: null,
});

const 소개태그열개 = defineCase({
  tcId: 'MTA-FN-415',
  name: '소개 해시태그가 9개일 때 하나를 더하면 10개가 된다',
  platforms: ['android'],
  precondition: ['「Featured hashtags」가 9개다', '「Featured hashtags」가 10개다'],
  techniques: ['경계값 분석'],
  params: z.object({
    열번째: z.string().min(4).max(30).describe('10번째로 더할 해시태그 — 「qa태그」로 시작하고 # 없는 글').default('qa태그열'),
    열한번째: z.string().min(4).max(30).describe('11번째로 더해 볼 해시태그 — 「qa태그」로 시작하고 # 없는 글').default('qa태그열하나'),
  }),
  expected: z.object({ 최대: z.number().describe('소개 해시태그 최대 개수').default(10) }),
});

const 소개태그더하기 = defineCase({
  tcId: 'MTA-FN-416',
  name: '「Add hashtag」로 「qa태그」를 더하면 「Featured hashtags」에 보인다',
  platforms: ['android'],
  precondition: ['프로필 편집이 열려 있다', '소개 해시태그 「qa태그」가 있다'],
  params: z.object({ 태그: z.string().min(4).max(30).describe('더할 해시태그 — 「qa태그」로 시작하고 # 없는 글').default('qa태그') }),
  expected: null,
});

const 탭설정 = defineCase({
  tcId: 'MTA-UI-350',
  name: '「Profile tab settings」에 「‘Media’ tab」 · 「Include replies」 · 「‘Featured’ tab」 스위치와 하단 안내가 보인다',
  platforms: ['android'],
  precondition: ['프로필 편집이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 이름저장 = defineCase({
  tcId: 'MTA-FN-656',
  name: '이름 편집 화면 상단 「저장」을 누르면 「저장 중…」 뒤 저장된다',
  platforms: ['android'],
  precondition: ['「Display name」 편집 화면이 열려 있다'],
  params: z.object({ 이름: z.string().min(1).max(30).describe('바꿀 표시 이름 — 30자 이하').default('QA 이름 저장') }),
  expected: z.object({ 저장중: z.string().describe('저장하는 동안 저장 자리의 글').default('저장 중…') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-045',
  name: '프로필 편집 — 순서 · 해시태그 · 탭 설정',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [항목순서, 라벨글자수, 소개태그열개, 소개태그더하기, 탭설정, 이름저장],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 이름 = new 이름편집화면(driver);
  const 항목들 = new 항목목록화면(driver);
  const 항목 = new 항목편집화면(driver);
  const 태그들 = new 추천해시태그화면(driver);
  const 탭들 = new 탭설정화면(driver);
  const 창 = new 확인창(driver);
  let 나: 계정 | undefined;
  let 원본: 프로필원본 | undefined;

  const 기존항목수 = (): number => (원본?.fields ?? []).filter((칸) => !칸.name.startsWith('QA')).length;

  await test.cleanup('바꾼 프로필 항목 · 소개 해시태그 · 이름을 처음 상태로 되돌린다', async () => {
    if (나 === undefined) return;
    await 소개해시태그QA지우기(나, 'qa태그');
    if (원본 !== undefined) await 프로필되돌리기(나, 원본);
  });

  await test.case(항목순서, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword, '프로필 고쳐도 되는 계정');
    let 첫째 = '';
    let 둘째 = '';
    await test.step('프로필 고쳐도 되는 계정으로 홈에 들어간다', async () => {
      원본 = await 프로필원본읽기(나!);
      await 프로필항목맞추기(나!, Math.max(기존항목수(), 2), 'QA항목');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('첫 항목을 끌어 둘째 아래로 옮긴다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.항목줄누르기();
      await verify('「Custom fields」 화면이 보인다', await 항목들.떴나(), true, { blocker: true });
      const 글 = await 항목들.라벨글들();
      첫째 = 글[0] ?? '';
      둘째 = 글[1] ?? '';
      await 항목들.끌어옮기기(첫째, 둘째);
      await verify(
        '프로필 항목을 끌면 항목 순서가 바뀐다',
        await 될때까지(
          driver,
          async () => {
            const 지금 = await 항목들.라벨글들();
            return 지금[0] === 둘째 && 지금[1] === 첫째;
          },
          15_000,
        ),
        true,
      );
    });
  });

  await test.case(라벨글자수, async ({ params }) => {
    await test.step('「Add field」 화면을 연다', async () => {
      await 프로필항목맞추기(나!, 기존항목수(), 'QA항목');
      const 편집 = await 프로필편집으로(driver);
      await 편집.항목줄누르기();
      await 항목들.항목추가누르기();
      await verify('「Add field」 화면이 보인다', await 항목.추가화면떴나(), true, { blocker: true });
    });
    await test.step('「라벨」에 255자를 적고 저장한다', async () => {
      await 항목.라벨적기(`QA${길이글(params.안글자수 - 2)}`);
      await 항목.저장누르기();
      await verify('「라벨」에 255자를 적고 저장하면 그 항목이 저장된다', await 될때까지(driver, async () => (await 프로필원본읽기(나!)).fields.some((칸) => 칸.name.length === params.안글자수), 20_000), true);
    });
    await test.step('「라벨」에 256자를 적고 저장한다', async () => {
      await 프로필항목맞추기(나!, 기존항목수(), 'QA항목');
      const 편집 = await 프로필편집으로(driver);
      await 편집.항목줄누르기();
      await 항목들.항목추가누르기();
      await verify('「Add field」 화면이 다시 보인다', await 항목.추가화면떴나(), true, { blocker: true });
      await 항목.라벨적기(`QA${길이글(params.밖글자수 - 2)}`);
      await 항목.저장누르기();
      await 될때까지(driver, async () => !(await 항목.추가화면떴나(1_000)), 10_000);
      await verify('「라벨」 256자 항목은 저장되지 않는다', !(await 프로필원본읽기(나!)).fields.some((칸) => 칸.name.length === params.밖글자수), true);
    });
  });

  await test.case(소개태그열개, async ({ params, expected }) => {
    await test.step('「Featured hashtags」를 9개로 맞춘다', async () => {
      await 소개해시태그맞추기(나!, 9, 'qa태그');
    });
    await test.step('10번째 소개 해시태그를 더한다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.해시태그줄누르기();
      await verify('「Featured hashtags」 화면이 보인다', await 태그들.떴나(), true, { blocker: true });
      await 태그들.해시태그더하기(params.열번째);
      await verify('소개 해시태그가 9개일 때 하나를 더하면 10개가 된다', await 될때까지(driver, async () => (await 태그들.태그글들()).length === expected.최대, 20_000), true);
    });
    await test.step('11번째 소개 해시태그를 더한다', async () => {
      if (await 태그들.해시태그추가있나(3_000)) {
        await 태그들.해시태그더하기(params.열한번째);
        await 될때까지(driver, async () => (await 태그들.태그글들()).length > expected.최대, 8_000);
      }
      await verify('소개 해시태그가 10개일 때 11번째는 더해지지 않는다', (await 태그들.태그글들()).length, expected.최대);
    });
  });

  await test.case(소개태그더하기, async ({ params }) => {
    await test.step('소개 해시태그에서 「qa태그」를 비운다', async () => {
      await 소개해시태그QA지우기(나!, 'qa태그');
    });
    await test.step('「Add hashtag」에 「qa태그」를 적고 「추가」를 누른다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.해시태그줄누르기();
      await verify('「Featured hashtags」 화면이 보인다', await 태그들.떴나(), true, { blocker: true });
      await 태그들.해시태그더하기(params.태그);
      await verify('「Add hashtag」로 「qa태그」를 더하면 「Featured hashtags」에 보인다', await 될때까지(driver, async () => (await 태그들.태그글들()).includes(`#${params.태그}`), 20_000), true);
    });
    await test.step('「qa태그」 줄 삭제를 누른다', async () => {
      await 태그들.삭제누르기(params.태그);
      await verify('소개 해시태그 삭제는 「Remove hashtag?」를 묻는다', await 창에글있나(창, 'Remove hashtag?'), true);
      await 창.취소누르기();
    });
  });

  await test.case(탭설정, async () => {
    await test.step('「Profile tab settings」를 연다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.탭설정줄누르기();
      await verify('「Profile tab settings」 화면이 보인다', await 탭들.떴나(), true, { blocker: true });
      const 미디어 = await verify('「‘Media’ tab」 스위치가 보인다', await 탭들.스위치있나('‘Media’ tab'), true);
      const 답글 = await verify('「Include replies」 스위치가 보인다', await 탭들.스위치있나('Include replies'), true);
      const 추천 = await verify('「‘Featured’ tab」 스위치가 보인다', await 탭들.스위치있나('‘Featured’ tab'), true);
      const 안내 = await verify('하단 안내가 보인다', (await 탭들.하단안내글()) !== '', true);
      await verify('「Profile tab settings」에 「‘Media’ tab」 · 「Include replies」 · 「‘Featured’ tab」 스위치와 하단 안내가 보인다', 미디어 && 답글 && 추천 && 안내, true);
    });
  });

  await test.case(이름저장, async ({ params, expected }) => {
    await test.step('이름을 바꾸고 「저장」을 누른다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.이름줄누르기();
      await verify('「Display name」 편집 화면이 보인다', await 이름.떴나(), true, { blocker: true });
      await 이름.적기(params.이름);
      await 이름.저장누르기();
      const 저장중 = await verify('저장하는 동안 저장 자리에 「저장 중…」이 보인다', await 이름.저장글될때까지(expected.저장중, 10_000), true);
      const 저장됨 = await verify('바꾼 이름이 서버에 저장된다', await 될때까지(driver, async () => (await 프로필원본읽기(나!)).display_name === params.이름, 30_000), true);
      await verify('이름 편집 화면 상단 「저장」을 누르면 「저장 중…」 뒤 저장된다', 저장중 && 저장됨, true);
    });
  });
});
