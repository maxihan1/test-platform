// 작성 에이전트의 자료 다루기 순수 함수 검사. 자료 순서·파일 변환·돌릴 조건·셸 허용 판정이 여기서 고정된다
import { describe, expect, it } from 'vitest';

import { 가릴트리파일, 글자인가, 돌릴수있나, 못읽는자료, 셸허용됐나, 입력만, 자료계획, 자료출처, 지울원본, 화면만인가, type 자료 } from './authoring-assets.js';
import { 역방향절 } from './authoring-reverse.js';
import { 줄프롬프트, 클로드인자 } from './authoring-rules.js';

const 파일 = (id: number, position: number, name: string): 자료 => ({
  id,
  position,
  kind: 'FILE',
  name,
  figmaUrl: null,
});
const 피그마 = (id: number, position: number, 주소: string): 자료 => ({
  id,
  position,
  kind: 'FIGMA',
  name: 주소,
  figmaUrl: 주소,
});
const 주소A = 'https://www.figma.com/design/AAA/?node-id=1-2';

describe('자료계획 — 받은 파일을 어떻게 읽힐까', () => {
  it('맥은 doc·docx 를 textutil 로 글자만 뽑고 그 txt 를 읽힌다', () => {
    const [가, 나] = 자료계획([파일(7, 1, '기획서.docx'), 파일(8, 2, '옛기획.DOC')], '/tmp/authoring-3', 'darwin');
    expect(가).toEqual({
      kind: 'FILE',
      id: 7,
      name: '기획서.docx',
      받을자리: '/tmp/authoring-3/7.docx',
      변환: {
        명령: 'textutil',
        인자: ['-convert', 'txt', '-output', '/tmp/authoring-3/7.txt', '/tmp/authoring-3/7.docx'],
      },
      읽을자리: '/tmp/authoring-3/7.txt',
    });
    expect(나).toMatchObject({ 받을자리: '/tmp/authoring-3/8.doc', 읽을자리: '/tmp/authoring-3/8.txt' });
  });

  it('서버(리눅스)는 docx 를 pandoc 으로 바꾼다 — textutil 은 맥에만 있다', () => {
    const [가] = 자료계획([파일(7, 1, '기획서.docx')], '/t', 'linux');
    expect(가).toMatchObject({
      변환: { 명령: 'pandoc', 인자: ['-t', 'plain', '--wrap=none', '-o', '/t/7.txt', '/t/7.docx'] },
      읽을자리: '/t/7.txt',
    });
  });

  it('서버에서 옛 .doc 은 못 읽는다고 미리 말한다 — pandoc 은 docx 만 읽는다', () => {
    const 계획 = 자료계획([파일(8, 1, '옛기획.DOC'), 파일(9, 2, 'a.pdf')], '/t', 'linux');
    expect(못읽는자료(계획, 'linux')).toMatch(/옛기획\.DOC.*docx/);
    expect(못읽는자료(계획, 'darwin')).toBeNull();
    expect(못읽는자료(자료계획([파일(9, 1, 'a.pdf')], '/t', 'linux'), 'linux')).toBeNull();
  });

  it('pdf·md·txt 는 그대로 읽힌다', () => {
    const 계획 = 자료계획([파일(1, 1, 'a.pdf'), 파일(2, 2, 'b.md'), 파일(3, 3, 'c.txt')], '/t');
    expect(계획.map((c) => (c.kind === 'FILE' ? [c.변환, c.읽을자리] : null))).toEqual([
      [null, '/t/1.pdf'],
      [null, '/t/2.md'],
      [null, '/t/3.txt'],
    ]);
  });

  it('디스크 이름은 사람이 준 이름이 아니라 자료 번호다 — 폴더 거슬러 오르기를 막는다', () => {
    const [가] = 자료계획([파일(9, 1, '..기획서.pdf')], '/t');
    expect(가).toMatchObject({ 받을자리: '/t/9.pdf', name: '..기획서.pdf' });
  });

  it('피그마는 주소만 넘긴다. 받을 것이 없다', () => {
    expect(자료계획([피그마(4, 1, 주소A)], '/t')).toEqual([{ kind: 'FIGMA', id: 4, 주소: 주소A }]);
  });

  it('자리 순서대로 늘어선다', () => {
    const 계획 = 자료계획([피그마(4, 2, 주소A), 파일(5, 1, 'a.pdf')], '/t');
    expect(계획.map((c) => c.kind)).toEqual(['FILE', 'FIGMA']);
  });
});

describe('자료출처 — 어느 행의 자료를 읽나', () => {
  it('작성 요청은 자기 행이다', () => {
    expect(자료출처({ id: 5, kind: 'AUTHOR', sourceId: null })).toBe(5);
  });

  it('재실행은 원본 행이다. 재실행 행에는 자료가 없다', () => {
    expect(자료출처({ id: 6, kind: 'RERUN', sourceId: 5 })).toBe(5);
  });
});

describe('돌릴수있나 — 빈 입력에 구독 한도를 쓰지 않는다', () => {
  it('자료도 본문도 없으면 막는다', () => {
    expect(돌릴수있나({}, [])).toMatch(/자료도 기획서 본문도 없다/);
    expect(돌릴수있나({ specText: '' }, [])).not.toBeNull();
  });

  it('옛 행은 본문으로 통과한다', () => {
    expect(돌릴수있나({ specText: '본문' }, [])).toBeNull();
  });

  it('피그마 자료가 있는데 토큰이 없으면 설정 화면으로 보낸다', () => {
    expect(돌릴수있나({}, [피그마(1, 1, 주소A)])).toMatch(/설정 화면에 피그마 토큰을 넣어라/);
  });

  it('피그마 토큰이 있으면 통과한다', () => {
    expect(돌릴수있나({ figmaToken: 'figd_x' }, [피그마(1, 1, 주소A)])).toBeNull();
  });

  it('파일만 있으면 토큰 없이 통과한다', () => {
    expect(돌릴수있나({}, [파일(1, 1, 'a.pdf')])).toBeNull();
  });

  it('화면만(대조 + 시작 주소)은 자료가 없어도 돈다', () => {
    expect(돌릴수있나({ 화면만: true }, [])).toBeNull();
  });
});

describe('입력만 — 재실행이 원본을 읽을 때 에이전트 산출물을 섞지 않는다', () => {
  it('표시 사본과 역기획서를 빼고 역할이 없으면 입력으로 본다', () => {
    const 들 = [
      { ...파일(1, 1, 'a.docx'), role: 'INPUT' as const },
      { ...파일(2, 2, 'a-표시.docx'), role: 'MARKED' as const },
      { ...파일(3, 3, '역기획서.docx'), role: 'REVERSE_SPEC' as const },
      파일(4, 4, 'b.pdf'),
    ];
    expect(입력만(들).map((a) => a.id)).toEqual([1, 4]);
  });
});

describe('셸허용됐나 — 자식이 npm·npx·playwright 를 돌릴 수 있나', () => {
  const 사용자 = (allow: string[]) => ({ 어디: '사용자', 값: { permissions: { allow } } });

  it('Bash 를 통째로 풀었으면 된다', () => {
    expect(셸허용됐나([사용자(['Bash(*)'])])).toBe(true);
    expect(셸허용됐나([사용자(['Read', 'Bash'])])).toBe(true);
  });

  it('npx 만 푼 부분 허용은 안 된다 — 자식은 npm·playwright 도 쓴다', () => {
    expect(셸허용됐나([사용자(['Bash(npx:*)'])])).toBe(false);
    expect(셸허용됐나([사용자(['Bash(npx *)', 'Bash(git:*)'])])).toBe(false);
  });

  it('defaultMode 만으로는 안 된다 — 자식을 --permission-mode acceptEdits 로 띄워 덮인다', () => {
    expect(셸허용됐나([{ 어디: '사용자', 값: { permissions: { defaultMode: 'bypassPermissions' } } }])).toBe(false);
  });

  it('아무 설정에도 없으면 안 된다', () => {
    expect(셸허용됐나([{ 어디: '사용자', 값: {} }, 사용자(['Bash(git:*)'])])).toBe(false);
  });

  it('추적되는 프로젝트 설정(.claude/settings.json)은 인정한다 — 작업방에도 checkout 되어 자식이 읽는다', () => {
    expect(셸허용됐나([{ 어디: '프로젝트', 값: { permissions: { allow: ['Bash(*)'] } } }])).toBe(true);
  });

  it('local 설정은 인정하지 않는다 — ~/.claude 의 것은 CLI 가 안 읽고, 프로젝트 것은 추적 안 돼 작업방에 없다', () => {
    expect(셸허용됐나([{ 어디: '사용자 local', 값: { permissions: { allow: ['Bash(*)'] } } }])).toBe(false);
    expect(셸허용됐나([{ 어디: '프로젝트 local', 값: { permissions: { allow: ['Bash(*)'] } } }])).toBe(false);
  });
});

describe('줄프롬프트 — 자료 목록을 싣는다', () => {
  const 계획 = 자료계획([파일(7, 1, '결제 기획.docx'), 피그마(8, 2, 주소A), 파일(9, 3, '부록.pdf')], '/t');
  const 글 = 줄프롬프트({ id: 3, kind: 'AUTHOR' }, 'TODO', 계획);

  it('파일은 읽을 경로와 원래 이름을 같이 싣는다', () => {
    expect(글).toContain('/t/7.txt');
    expect(글).toContain('결제 기획.docx');
  });

  it('자료마다 자료 번호를 싣는다 — 역방향 차이 파일이 어느 자료의 차이인지 적는다', () => {
    expect(글).toContain('(자료 번호 7)');
    expect(글).toContain('(자료 번호 8)');
    expect(글).toContain('(자료 번호 9)');
  });

  it('파일 목록과 피그마 목록이 각각 자리 순서대로다', () => {
    expect(글.indexOf('/t/7.txt')).toBeLessThan(글.indexOf('/t/9.pdf'));
    expect(글).toContain(주소A);
  });

  it('피그마 읽는 법은 tpx-cases 스킬을 따르라고만 한다', () => {
    expect(글).toMatch(/tpx-cases/);
    expect(글).not.toMatch(/figma-reader/);
  });

  it('옛 행이면 본문을 싣는다', () => {
    expect(줄프롬프트({ id: 3, kind: 'AUTHOR', specText: '옛 본문' }, 'TODO', [])).toContain('옛 본문');
  });

  it('토큰은 프롬프트에 절대 안 싣는다', () => {
    expect(줄프롬프트({ id: 3, kind: 'AUTHOR', figmaToken: 'figd_비밀' }, 'TODO', 계획)).not.toContain('figd_비밀');
  });
});

const 기본모델 = { model: 'opus', effort: 'high', fallback: 'sonnet' };

describe('클로드인자 — 자료 폴더를 읽게 연다', () => {
  it('--add-dir 로 자료 폴더를 연다', () => {
    const 인자 = 클로드인자('/t', 기본모델);
    expect(인자[인자.indexOf('--add-dir') + 1]).toBe('/t');
  });

  it('--bare 는 없다', () => {
    expect(클로드인자('/t', 기본모델)).not.toContain('--bare');
  });

  it('역방향 절 — 훑기 30분 예산과 화면 기록 폴더(작업방 안)를 준다', () => {
    const 글 = 역방향절({ 화면만: false, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
    expect(글).toContain('30분');
    expect(글).toContain('/w/author-7/assets/screens');
  });

  it('역방향 절 — 화면만은 PRD 에 아직 없는 화면, 대조는 한 칸 정의를 가리킨다', () => {
    const 화면만 = 역방향절({ 화면만: true, 산출물폴더: '/o/out', 요청번호: 1 }).join('\n');
    expect(화면만).toContain('PRD 에 아직 없는 화면만');
    expect(화면만).not.toContain('메뉴 1단계');
    expect(화면만).not.toContain('바로 이어지는 한 칸');
    const 대조 = 역방향절({ 화면만: false, 산출물폴더: '/o/out', 요청번호: 1 }).join('\n');
    expect(대조).toContain('「한 칸」');
  });

  it('역방향 절 — 크롤 폴더(산출물 폴더 옆)와 크롤러 명령을 준다. 대조도 사이트 전체를 찍고 AI 는 기획서 화면만 훑는다 (PRD-F6-02)', () => {
    const 화면만 = 역방향절({ 화면만: true, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
    expect(화면만).toContain('/w/author-7/assets/crawl');
    expect(화면만).toContain('npx tsx scripts/authoring-crawl.ts "${TARGET_START_URL:-$TARGET_BASE_URL}" --follow --state <상태 파일> --login <로그인 스크립트>');
    expect(화면만).not.toContain('기획서가 말하는 화면과 그 「한 칸」뿐');
    const 대조 = 역방향절({ 화면만: false, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
    expect(대조).toContain('npx tsx scripts/authoring-crawl.ts "${TARGET_START_URL:-$TARGET_BASE_URL}" <기획서가 말하는 화면 주소들> --follow --state <상태 파일> --login <로그인 스크립트>');
    expect(대조).toContain('기획서가 말하는 화면과 그 「한 칸」뿐');
  });

  it('역방향 절 — 화면만이면 크롤러에 --covered 를 붙이고 덮음 줄은 훑지 않게 한다. 대조는 둘 다 없다 (PRD-F6-03)', () => {
    const 화면만 = 역방향절({ 화면만: true, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
    expect(화면만).toContain('--keep /w/author-7/assets/kept/index.json --cases /w/author-7/assets/screen-cases.json --covered /w/author-7/assets/covered.json --out /w/author-7/assets/crawl');
    expect(화면만).toContain('`덮음: true` 인 화면은 PRD 에 이미 있다 — 훑지 말고 항목 · 새 케이스도 만들지 마라');
    expect(화면만).toContain('훑을 화면이 하나도 없으면 아래 바뀐 화면 케이스만 하고');
    expect(화면만).toContain('PRD 에 없는 화면 0');
    const 대조 = 역방향절({ 화면만: false, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
    expect(대조).not.toContain('--covered');
    expect(대조).not.toContain('덮음');
  });

  it('역방향 절 — 대조 · 화면만 둘 다 크롤러에 --cases 를 붙이고 케이스 칸이 있는 줄만 먼저 돌려 보게 한다 (PRD-F6-04)', () => {
    for (const 화면만 of [true, false]) {
      const 절 = 역방향절({ 화면만, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
      expect(절).toContain('--keep /w/author-7/assets/kept/index.json --cases /w/author-7/assets/screen-cases.json');
      expect(절).toContain('훑기를 마친 뒤(훑을 화면이 없어도) 표 · 표준 기획서보다 먼저 reverse.md 「바뀐 화면 케이스」');
    }
  });

  it('화면만인가 — 대상 서버가 있고 자료가 0 이면 시작 주소가 없어도 화면만이다 (PRD-F6-03)', () => {
    const 대상 = { env: 'dev', baseUrl: 'https://s.test', loginId: 'a', loginPassword: 'pass1234' };
    expect(화면만인가({ target: 대상 }, [])).toBe(true);
    expect(화면만인가({ target: { ...대상, startUrl: 'https://s.test/x' } }, [])).toBe(true);
    expect(화면만인가({ target: 대상 }, [파일(1, 1, 'a.docx')])).toBe(false);
    expect(화면만인가({}, [])).toBe(false);
  });

  it('역방향 절 — 크롤러에 저장본(자료 폴더 kept/index.json)을 넘긴다 (2026-10-04 · 바뀐 화면만 다시 훑는다)', () => {
    const 글 = 역방향절({ 화면만: true, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7 }).join('\n');
    expect(글).toContain('--keep /w/author-7/assets/kept/index.json');
  });

  it('역방향 절 — 화면만이면 훑지 않을 경로를 크롤러에 경로마다 --exclude(작은따옴표)로 붙이고 「더 갈 곳」에서도 빼게 한다 (#153)', () => {
    const 제외 = ['/daejeon', '/gyeongnam'];
    const 화면만 = 역방향절({ 화면만: true, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7, 제외 }).join('\n');
    expect(화면만).toContain("--exclude '/daejeon' --exclude '/gyeongnam'");
    expect(화면만).toContain('목록에 없는 주소 중 이 경로와 그 아래');
    expect(화면만).toContain('「더 갈 곳」에도 적지 마라');
    expect(줄프롬프트({ id: 7, kind: 'AUTHOR' }, 'CDY', [], undefined, { 화면만: true, 산출물폴더: '/w/out', 제외 })).toContain("--exclude '/daejeon'");
  });

  it('역방향 절 — 대조도 훑지 않을 경로를 붙이고, 그 경로가 없으면 --exclude 도 「더 갈 곳」 줄도 없다 (#153 · PRD-F6-02)', () => {
    const 대조 = 역방향절({ 화면만: false, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7, 제외: ['/daejeon'] }).join('\n');
    expect(대조).toContain("--exclude '/daejeon'");
    const 없음 = 역방향절({ 화면만: true, 산출물폴더: '/w/author-7/assets/out', 요청번호: 7, 제외: [] }).join('\n');
    expect(없음).not.toContain('--exclude');
    expect(없음).not.toContain('「더 갈 곳」에도');
  });

  it('stream-json 으로 돌린다 — 끊겨도 토큰을 센다 (작성 §7 「토큰 사용량」)', () => {
    const 인자 = 클로드인자('/t', 기본모델);
    expect(인자[인자.indexOf('--output-format') + 1]).toBe('stream-json');
    expect(인자).toContain('--verbose');
  });
});

describe('먼저 가리기 — 자식을 띄우기 전에 무엇을 지우고 무엇을 고쳐 쓰나', () => {
  it('지울원본 — 글자로 바꾼 워드 원본만 고른다. 바꾸지 않은 자료와 피그마는 뺀다', () => {
    const 계획 = 자료계획([파일(1, 0, '기획.docx'), 파일(2, 1, '화면.pdf'), 파일(3, 2, '메모.md'), 피그마(4, 3, 'https://figma.com/x')], '/w/in', 'linux');
    expect(지울원본(계획)).toEqual(['/w/in/1.docx']);
  });
  it('가릴트리파일 — 트리에서는 앞 실행이 바꾼 케이스·표만 가린다. 이미 커밋된 파일·그 밖 파일은 안 건드린다', () => {
    expect(가릴트리파일(['tests/mkt/MKT-001.spec.ts', 'docs/cases/MKT.md', 'package.json', 'docs/other.md', 'tests/../x'])).toEqual([
      'tests/mkt/MKT-001.spec.ts',
      'docs/cases/MKT.md',
    ]);
  });
  it('글자인가 — NUL 바이트가 없으면 글자 파일이다', () => {
    expect(글자인가(Buffer.from('비밀번호 ••••••\n', 'utf8'))).toBe(true);
    expect(글자인가(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]))).toBe(false);
    expect(글자인가(Buffer.alloc(0))).toBe(true);
  });
});
