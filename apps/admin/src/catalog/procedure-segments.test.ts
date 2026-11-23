// 프로시저 파일을 케이스 구간으로 갈라 읽는 값 셋 — 구간별 단계 제목 · 화면 연결 · 지문 (카탈로그 §3.1 「케이스 구간」)

import { describe, expect, it } from 'vitest';

import { 구간, 선언, 절차, 정상본문, 프로시저글 } from './procedure-fixture.js';
import { 구간지문 } from './procedure.js';
import { 구간별화면파일 } from './screenMap.js';
import { 프로시저단계제목 } from './stepTitles.js';
import { caseSteps } from './steps.js';

const 정리 = `  await test.cleanup('올린 글을 지운다', async () => {});\n`;
const 안보류 = [false, false, false];

describe('프로시저단계제목 — kit 이 절차를 케이스에 붙이는 규칙 그대로', () => {
  it('케이스 사이 절차는 다음 케이스 것이다', () => {
    expect(프로시저단계제목(프로시저글(정상본문), 안보류)).toEqual([
      ['글쓰기 화면을 연다', '본문을 비운다'],
      ['본문에 501자를 넣는다'],
      ['게시를 누른다', '타임라인을 연다'],
    ]);
  });

  it('시작 정리는 첫 케이스, 끝 정리는 마지막 케이스 것이다 — 케이스 차례대로 이으면 러너의 단계 번호 차례다', () => {
    const 글 = 프로시저글(정리 + 정상본문);
    const 제목 = 프로시저단계제목(글, 안보류)!;
    expect(제목[0]).toEqual(['시작 정리 — 올린 글을 지운다', '글쓰기 화면을 연다', '본문을 비운다']);
    expect(제목[2]).toEqual(['게시를 누른다', '타임라인을 연다', '끝 정리 — 올린 글을 지운다']);
    expect(제목.flat()).toEqual(caseSteps(글).stepTitles);
  });

  it('보류 케이스는 단계가 없고 그 앞 절차는 뒤의 보류 아닌 케이스 것이다', () => {
    const 본문 = 구간('본문없음', '하나') + 절차('사진을 고른다') + 구간('글자수초과', '둘') + 절차('게시를 누른다') + 구간('게시확인', '셋');
    expect(프로시저단계제목(프로시저글(본문), [false, true, false])).toEqual([['하나'], [], ['사진을 고른다', '게시를 누른다', '셋']]);
  });

  it('보류 케이스가 맨 앞 · 맨 뒤면 정리는 처음 · 마지막으로 도는 케이스에 붙고, 뒤에 돌 케이스가 없는 절차는 안 센다', () => {
    const 글 = 프로시저글(정리 + 정상본문);
    expect(프로시저단계제목(글, [true, false, true])).toEqual([[], ['시작 정리 — 올린 글을 지운다', '글쓰기 화면을 연다', '본문에 501자를 넣는다', '끝 정리 — 올린 글을 지운다'], []]);
    expect(프로시저단계제목(글, [true, true, true])).toEqual([[], [], []]);
  });

  it('다 셀 수 없는 케이스만 null 이다', () => {
    const 본문 = 구간('본문없음', '하나') + `  for (const x of [1]) await test.step('돌린다', async () => {});\n` + 구간('글자수초과', '둘') + 구간('게시확인', '셋');
    expect(프로시저단계제목(프로시저글(본문), 안보류)).toEqual([['하나'], null, ['셋']]);
  });

  it('정리 제목을 글자로 못 읽으면 정리가 붙는 처음 · 마지막 케이스가 null 이다', () => {
    const 글 = 프로시저글(`  await test.cleanup(제목, async () => {});\n${정상본문}`);
    expect(프로시저단계제목(글, 안보류)).toEqual([null, ['본문에 501자를 넣는다'], null]);
  });

  it('구간을 못 가르는 파일과 옛 꼴 파일은 null 이다', () => {
    expect(프로시저단계제목(프로시저글(구간('본문없음', '하나') + 구간('게시확인', '셋')), 안보류)).toBeNull();
    expect(프로시저단계제목(`export const spec = defineCase({ tcId: 'XQ-001' });\ntest(spec, async () => {});\n`, [])).toBeNull();
  });
});

describe('구간별화면파일 — 케이스 구간에서 쓴 화면만', () => {
  const 가져오기 = `import { 내글지우기 } from './helpers/post.helper.js';
import { 머리글 } from './components/header.component.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import type { 설정화면 } from './pages/settings.page.js';
import { 타임라인화면 } from './pages/timeline.page.js';
`;
  const 본문 =
    `  const 글쓰기 = new 글쓰기화면(driver);\n  const 타임라인 = new 타임라인화면(driver);\n` +
    `  await test.cleanup('올린 글을 지운다', async () => { await 타임라인.내글을지운다(); await 내글지우기(driver); });\n` +
    절차('글쓰기 화면을 연다', ' await 글쓰기.연다(); ') +
    구간('본문없음', '본문을 비운다', ` await verify('꺼져 있다', await 글쓰기.게시버튼이켜졌나(), false); `) +
    구간('글자수초과', '본문에 501자를 넣는다') +
    절차('게시를 누른다', ' await 글쓰기.게시(); ') +
    구간('게시확인', '타임라인을 연다', ` await verify('보인다', await 타임라인.첫글(), await new 머리글(driver).제목()); `);

  it('만들어 두기만 한 줄과 정리에서만 쓴 화면은 잇지 않고, 쓴 구간의 케이스에만 잇는다', () => {
    expect(구간별화면파일(프로시저글(본문, { 가져오기 }))).toEqual([
      ['pages/compose.page.ts'],
      [],
      ['pages/compose.page.ts', 'pages/timeline.page.ts', 'components/header.component.ts'],
    ]);
  });

  it('구간을 못 가르는 파일과 옛 꼴 파일은 null 이다 — 부르는 쪽이 파일이 가져온 것 전부로 잇는다', () => {
    expect(구간별화면파일(프로시저글(본문, { 가져오기, cases: '묶음' }))).toBeNull();
    expect(구간별화면파일(`import { 글쓰기화면 } from './pages/compose.page.js';\nexport const spec = defineCase({ tcId: 'XQ-001' });\n`)).toBeNull();
  });
});

describe('구간지문 — 자기 구간과 앞 흐름', () => {
  const 처음 = 구간지문(프로시저글(정상본문))!;
  const 달라진 = (글: string): string[] => 구간지문(글)!.flatMap((x, i) => [...(x.seg === 처음[i]!.seg ? [] : [`${i + 1} 자기`]), ...(x.flow === 처음[i]!.flow ? [] : [`${i + 1} 앞`])]);

  it('케이스 하나의 확인만 고치면 그 케이스는 자기 구간이, 뒤 케이스는 앞 흐름만 달라진다', () => {
    expect(달라진(프로시저글(정상본문.replace('본문에 501자를 넣는다', '본문에 600자를 넣는다')))).toEqual(['2 자기', '3 앞']);
  });

  it('케이스 사이 절차는 다음 케이스의 자기 구간이다', () => {
    expect(달라진(프로시저글(정상본문.replace('게시를 누른다', '게시 버튼을 누른다')))).toEqual(['3 자기']);
    expect(달라진(프로시저글(정상본문.replace('글쓰기 화면을 연다', '글쓰기를 연다')))).toEqual(['1 자기', '2 앞', '3 앞']);
  });

  it('프로시저 선언과 정리 선언이 바뀌면 모든 케이스의 앞 흐름이 달라진다', () => {
    expect(달라진(프로시저글(정상본문, { 이름: '글쓰기 — 다른 이름' }))).toEqual(['1 앞', '2 앞', '3 앞']);
    expect(달라진(프로시저글(정리 + 정상본문))).toEqual(['1 앞', '2 앞', '3 앞']);
  });

  it('케이스 선언이 바뀌면(보류를 달거나 풀면) 그 케이스만 자기 구간이 달라진다 — 옆 케이스는 앞 흐름뿐이다', () => {
    const 선언들 = 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102', "\n  held: '보류 — 값을 정해야 한다',") + 선언('게시확인', 'XQ-FN-103');
    expect(달라진(프로시저글(정상본문, { 선언들 }))).toEqual(['2 자기', '3 앞']);
  });

  it('import 줄은 어느 지문에도 안 든다', () => {
    expect(달라진(프로시저글(정상본문, { 가져오기: "import { 글쓰기화면 } from './pages/compose.page.js';\n" }))).toEqual([]);
  });

  it('맨 뒤에 케이스를 더해도 앞 케이스들은 그대로다', () => {
    const 글 = 프로시저글(정상본문 + 구간('삭제확인', '지운다'), { 선언들: 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102') + 선언('게시확인', 'XQ-FN-103') + 선언('삭제확인', 'XQ-FN-104'), cases: '[본문없음, 글자수초과, 게시확인, 삭제확인]' });
    expect(구간지문(글)!.slice(0, 3)).toEqual(처음);
  });

  it('구간을 못 가르는 파일과 옛 꼴 파일은 null 이다', () => {
    expect(구간지문(프로시저글(정상본문 + 절차('뒤에 둔 절차')))).toBeNull();
    expect(구간지문(`export const spec = defineCase({ tcId: 'XQ-001' });\n`)).toBeNull();
  });
});
