// 작성 진척 누적·파일 세기·끝낼 상태 판정 검사 (도메인/작성 §7 「중단 · 폐기 · 진척」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  거절로,
  끝낼상태,
  멈추라했나,
  자식제한,
  진척누적기,
  진척재기,
  케이스파일들,
  새케이스수,
  화면수,
} from './authoring-progress.js';

const 턴 = (id: string, input: number, output: number, content: unknown[] = [{ type: 'tool_use', name: 'Read' }]) =>
  JSON.stringify({
    type: 'assistant',
    message: {
      id,
      content,
      usage: {
        input_tokens: input,
        output_tokens: output,
        cache_read_input_tokens: 999,
        cache_creation_input_tokens: 5000,
      },
    },
  });

describe('진척누적기 — 흐름 줄을 먹여 토큰·마지막 동작을 모은다', () => {
  it('메시지 id 마다 마지막 사본의 입력+출력+캐시 읽기를 센다 — 캐시 쓰기는 안 센다', () => {
    const 누적 = 진척누적기(3600);
    누적.먹기(턴('a', 10, 1));
    누적.먹기(턴('a', 10, 50));
    누적.먹기(턴('b', 3, 7));
    누적.먹기('JSON 아님');
    expect(누적.스냅샷({ elapsedSec: 5, caseFiles: 2 })).toMatchObject({
      childRunning: true,
      elapsedSec: 5,
      limitSec: 3600,
      caseFiles: 2,
      tokens: 70 + 999 * 2,
      lastAction: '· Read',
    });
  });

  it('먹기는 흘릴 줄을 돌려준다 — 로그와 진척이 같은 줄을 본다', () => {
    const 누적 = 진척누적기(60);
    expect(누적.먹기(턴('a', 1, 1, [{ type: 'text', text: '케이스를 쓴다\n둘째 줄' }]))).toBe('» 케이스를 쓴다');
    expect(누적.먹기('{"type":"result"}')).toBeNull();
  });

  it('동작이 없으면 lastAction·lastActionAt·screens 칸을 안 싣는다', () => {
    const 몸 = 진척누적기(60).스냅샷({ elapsedSec: 0, caseFiles: 0 });
    expect(Object.keys(몸).sort()).toEqual(['caseFiles', 'childRunning', 'elapsedSec', 'limitSec', 'tokens']);
  });

  it('lastAction 은 160자로 자르고 lastActionAt 은 ISO 다 · screens 는 주면 싣는다', () => {
    const 누적 = 진척누적기(60);
    누적.먹기(턴('a', 1, 1, [{ type: 'tool_use', name: 'x'.repeat(300) }]));
    const 몸 = 누적.스냅샷({ elapsedSec: 1, caseFiles: 0, screens: 3 });
    expect(몸.lastAction).toHaveLength(160);
    expect(new Date(몸.lastActionAt ?? '').toISOString()).toBe(몸.lastActionAt);
    expect(몸.screens).toBe(3);
  });

  it('lastAction 에 테스트 계정 비밀번호·피그마 토큰 원문을 싣지 않는다', () => {
    const 누적 = 진척누적기(60, { loginPassword: 'pw-secret-9', figmaToken: 'figd_abcdefgh123' });
    누적.먹기(턴('a', 1, 1, [{ type: 'text', text: '로그인 pw-secret-9 로 한다' }]));
    expect(누적.스냅샷({ elapsedSec: 0, caseFiles: 0 }).lastAction).not.toContain('pw-secret-9');
    누적.먹기(턴('b', 1, 1, [{ type: 'text', text: '토큰 figd_abcdefgh123 으로 읽는다' }]));
    const 동작 = 누적.스냅샷({ elapsedSec: 0, caseFiles: 0 }).lastAction ?? '';
    expect(동작).not.toContain('figd_abcdefgh123');
    expect(동작).toContain('***');
  });

  it('이모지로 가득해도 서버 상한(160, UTF-16) 안이고 짝 없는 서로게이트가 없다', () => {
    const 누적 = 진척누적기(60);
    누적.먹기(턴('a', 1, 1, [{ type: 'tool_use', name: `x${'😀'.repeat(200)}` }]));
    const 동작 = 누적.스냅샷({ elapsedSec: 0, caseFiles: 0 }).lastAction ?? '';
    expect(동작.length).toBeLessThanOrEqual(160);
    expect(동작.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')).not.toMatch(/[\uD800-\uDFFF]/);
  });
});

const 말 = (id: string, text: string, parent: string | null = null) =>
  JSON.stringify({
    type: 'assistant',
    message: { id, content: [{ type: 'text', text }], usage: { input_tokens: 1, output_tokens: 1 } },
    parent_tool_use_id: parent,
  });

const 가짜시계 = () => {
  let 초 = 1000;
  return { 지금: () => 초 * 1000, 흐름: (n: number) => void (초 += n) };
};

describe('진척누적기 — 단계 표지', () => {
  it('글 가운데 줄의 표지도 잡아 로그 줄 뒤에 붙인다 · lastAction 은 글 첫 줄 그대로다', () => {
    const 누적 = 진척누적기(60);
    expect(누적.먹기(말('a', '표를 다 썼다\n[단계] 관문 3\n돌린다'))).toBe('» 표를 다 썼다 [단계] 관문 3');
    expect(누적.스냅샷({ elapsedSec: 0, caseFiles: 0 }).lastAction).toBe('» 표를 다 썼다');
  });

  it('parent_tool_use_id 가 null 인 자식 줄은 세고 문자열인 서브에이전트 줄은 안 센다', () => {
    const 시계 = 가짜시계();
    const 누적 = 진척누적기(60, {}, 시계.지금);
    누적.먹기(말('a', '[단계] 케이스 작성'));
    시계.흐름(30);
    expect(누적.먹기(말('b', '[단계] 관문 1', 'toolu_01'))).toBe('» [단계] 관문 1');
    expect(누적.단계표()).not.toMatch(/관문 1/);
    expect(누적.단계표()).toMatch(/케이스 작성/);
  });

  it('같은 메시지가 블록마다 되풀이돼도 한 번만 적는다', () => {
    const 누적 = 진척누적기(60);
    누적.먹기(말('a', '[단계] 요구사항 표'));
    expect(누적.먹기(말('a', '[단계] 요구사항 표'))).toBe('» [단계] 요구사항 표');
    expect(누적.단계표().match(/요구사항 표/g)).toHaveLength(2);
  });

  it('첫 줄이 표지면 로그 줄에 두 번 싣지 않는다', () => {
    expect(진척누적기(60).먹기(말('a', '[단계] 관문 1\n돌린다'))).toBe('» [단계] 관문 1');
  });

  it('비밀번호가 섞인 단계 이름은 (가림) 으로 짧게 적는다', () => {
    const 누적 = 진척누적기(60, { loginPassword: 'pw-secret-9' });
    expect(누적.먹기(말('a', '[단계] 로그인 pw-secret-9'))).not.toContain('pw-secret-9');
    expect(누적.단계표()).toContain('| (가림) |');
    expect(누적.단계표()).not.toContain('pw-secret-9');
  });

  it('이름의 | 는 표 칸을 밀지 않게 \\| 로 적는다', () => {
    const 누적 = 진척누적기(60);
    누적.먹기(말('a', '[단계] 관문 1|2'));
    expect(누적.단계표()).toContain('| 관문 1\\|2 |');
  });

  it('단계표 — 첫 표지 전 · 단계마다 시작과 걸린 시간 · 마지막은 부른 때까지 · 가장 긴 단계', () => {
    const 시계 = 가짜시계();
    const 누적 = 진척누적기(60, {}, 시계.지금);
    시계.흐름(65);
    누적.먹기(말('a', '[단계] 요구사항 표'));
    시계.흐름(600);
    누적.먹기(말('b', '[단계] 관문 3'));
    시계.흐름(3725);
    expect(누적.단계표()).toBe(
      [
        '| 단계 | 시작 | 걸린 시간 |',
        '|---|---|---|',
        '| (첫 표지 전) | 0:00 | 1:05 |',
        '| 요구사항 표 | 1:05 | 10:00 |',
        '| 관문 3 | 11:05 | 62:05 |',
        '',
        '가장 긴 단계: 관문 3 — 62:05',
      ].join('\n'),
    );
  });

  it('표지가 하나도 없으면 단계표는 빈 글이다', () => {
    const 누적 = 진척누적기(60);
    누적.먹기(말('a', '표를 쓴다'));
    expect(누적.단계표()).toBe('');
  });
});

describe('자식제한', () => {
  it('자식 한 번은 120분이다', () => {
    expect(자식제한).toBe(120 * 60_000);
  });
});

describe('파일 세기', () => {
  let 자리 = '';
  afterEach(() => rmSync(자리, { recursive: true, force: true }));

  it('자식 시작 뒤 새로 생긴 .spec.ts 만 센다 — 하위 폴더도, 없는 폴더는 0', () => {
    자리 = mkdtempSync(join(tmpdir(), 'progress-'));
    const 폴더 = join(자리, 'tests', 'mkt');
    expect(새케이스수(폴더, 케이스파일들(폴더))).toBe(0);
    mkdirSync(join(폴더, 'a'), { recursive: true });
    writeFileSync(join(폴더, 'OLD-1.spec.ts'), '');
    const 전 = 케이스파일들(폴더);
    writeFileSync(join(폴더, 'OLD-1.spec.ts'), '고침');
    writeFileSync(join(폴더, 'a', 'NEW-1.spec.ts'), '');
    writeFileSync(join(폴더, 'NEW-2.spec.ts'), '');
    writeFileSync(join(폴더, 'helper.ts'), '');
    expect(새케이스수(폴더, 전)).toBe(2);
  });

  it('진척재기는 자식이 쓰는 tests/<폴더> 에서 센다', () => {
    자리 = mkdtempSync(join(tmpdir(), 'progress-'));
    const 재기 = 진척재기(진척누적기(60), 자리, 'mkt');
    mkdirSync(join(자리, 'tests', 'mkt'), { recursive: true });
    writeFileSync(join(자리, 'tests', 'mkt', 'MKT-1.spec.ts'), '');
    mkdirSync(join(자리, 'mkt'));
    writeFileSync(join(자리, 'mkt', 'ELSE-1.spec.ts'), '');
    expect(재기().caseFiles).toBe(1);
  });

  it('화면수 — screens/*.md 만 센다 · 폴더가 없으면 0', () => {
    자리 = mkdtempSync(join(tmpdir(), 'progress-'));
    expect(화면수(join(자리, 'screens'))).toBe(0);
    mkdirSync(join(자리, 'screens'));
    writeFileSync(join(자리, 'screens', '1.md'), '');
    writeFileSync(join(자리, 'screens', '2.md'), '');
    writeFileSync(join(자리, 'screens', 'x.png'), '');
    expect(화면수(join(자리, 'screens'))).toBe(2);
  });
});

describe('끝낼상태 — 자식이 끝난 모양으로 끝낼 몸을 고른다 (null 이면 올린다)', () => {
  const r = (코드: number | null, 시간초과 = false, 멈춤으로죽음 = false) => ({
    코드,
    시간초과,
    멈춤으로죽음,
  });

  it('멈춤으로 죽었으면 STOPPED USER — 시간초과보다 앞선다', () => {
    expect(끝낼상태(r(null, true, true), false)).toEqual({
      status: 'STOPPED',
      stopReason: 'USER',
    });
  });
  it('시간초과면 STOPPED TIMEOUT', () => {
    expect(끝낼상태(r(null, true), false)).toEqual({
      status: 'STOPPED',
      stopReason: 'TIMEOUT',
    });
  });
  it('코드≠0 이고 한도면 STOPPED LIMIT · 그 밖은 작성 중 끊김(CRASH) — 만든 것이 남아 이어갈 수 있다', () => {
    expect(끝낼상태(r(1), true)).toEqual({
      status: 'STOPPED',
      stopReason: 'LIMIT',
    });
    expect(끝낼상태(r(1), false)).toEqual({
      status: 'STOPPED',
      stopReason: 'CRASH',
      error: '케이스를 만들다 끊겼다. 에이전트 기록을 봐라.',
    });
  });
  it('코드 0 이면 null — 한도 글이 섞여도 올린다', () => {
    expect(끝낼상태(r(0), true)).toBeNull();
  });
});

describe('거절로 — 올리기에서 막힌 것은 중단(REJECTED)이다', () => {
  it('거절 까닭을 error 에 싣는다', () => {
    expect(거절로('테스트 밖 파일을 고쳤다: package.json')).toEqual({
      status: 'STOPPED',
      stopReason: 'REJECTED',
      error: '테스트 밖 파일을 고쳤다: package.json',
    });
  });
});

describe('멈추라했나 — stage 응답 몸의 stop', () => {
  it('stop: true 일 때만 참', () => {
    expect(멈추라했나({ status: 200, 몸: { ok: true, stop: true } })).toBe(true);
    expect(멈추라했나({ status: 200, 몸: { ok: true, stop: false } })).toBe(false);
    expect(멈추라했나({ status: 200, 몸: null })).toBe(false);
    expect(멈추라했나(undefined)).toBe(false);
  });
});
