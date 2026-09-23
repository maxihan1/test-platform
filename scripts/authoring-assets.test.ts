// 작성 에이전트의 자료 다루기 순수 함수 검사. 자료 순서·파일 변환·돌릴 조건·셸 허용 판정이 여기서 고정된다
import { describe, expect, it } from 'vitest';

import { 돌릴수있나, 셸허용됐나, 자료계획, 자료출처, type 자료 } from './authoring-assets.js';
import { 줄프롬프트, 클로드인자 } from './authoring-agent.js';

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
  it('doc·docx 는 textutil 로 글자만 뽑고 그 txt 를 읽힌다', () => {
    const [가, 나] = 자료계획([파일(7, 1, '기획서.docx'), 파일(8, 2, '옛기획.DOC')], '/tmp/authoring-3');
    expect(가).toEqual({
      kind: 'FILE',
      id: 7,
      name: '기획서.docx',
      받을자리: '/tmp/authoring-3/7.docx',
      변환: ['-convert', 'txt', '-output', '/tmp/authoring-3/7.txt', '/tmp/authoring-3/7.docx'],
      읽을자리: '/tmp/authoring-3/7.txt',
    });
    expect(나).toMatchObject({ 받을자리: '/tmp/authoring-3/8.doc', 읽을자리: '/tmp/authoring-3/8.txt' });
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
    expect(자료계획([피그마(4, 1, 주소A)], '/t')).toEqual([{ kind: 'FIGMA', 주소: 주소A }]);
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
});

describe('셸허용됐나 — 자식이 git·gh·npm·npx 를 다 돌릴 수 있나', () => {
  const 사용자 = (allow: string[]) => ({ 어디: '사용자', 값: { permissions: { allow } } });

  it('Bash 를 통째로 풀었으면 된다', () => {
    expect(셸허용됐나([사용자(['Bash(*)'])])).toBe(true);
    expect(셸허용됐나([사용자(['Read', 'Bash'])])).toBe(true);
    expect(셸허용됐나([{ 어디: '사용자 local', 값: { permissions: { allow: ['Bash(*)'] } } }])).toBe(true);
  });

  it('npx 만 푼 부분 허용은 안 된다 — 자식은 git·gh·npm 도 쓴다', () => {
    expect(셸허용됐나([사용자(['Bash(npx:*)'])])).toBe(false);
    expect(셸허용됐나([사용자(['Bash(npx *)', 'Bash(git:*)'])])).toBe(false);
  });

  it('defaultMode 만으로는 안 된다 — 자식을 --permission-mode acceptEdits 로 띄워 덮인다', () => {
    expect(셸허용됐나([{ 어디: '사용자', 값: { permissions: { defaultMode: 'bypassPermissions' } } }])).toBe(false);
  });

  it('아무 설정에도 없으면 안 된다', () => {
    expect(셸허용됐나([{ 어디: '사용자', 값: {} }, 사용자(['Bash(git:*)'])])).toBe(false);
  });

  it('프로젝트 설정에서 푼 것은 인정하지 않는다 — 자식은 새 작업방에서 돌아 그 설정을 못 본다', () => {
    expect(셸허용됐나([{ 어디: '프로젝트', 값: { permissions: { allow: ['Bash(*)'] } } }])).toBe(false);
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

describe('클로드인자 — 자료 폴더를 읽게 연다', () => {
  it('--add-dir 로 자료 폴더를 연다', () => {
    const 인자 = 클로드인자('/t');
    expect(인자[인자.indexOf('--add-dir') + 1]).toBe('/t');
  });

  it('--bare 는 없다', () => {
    expect(클로드인자('/t')).not.toContain('--bare');
  });
});
