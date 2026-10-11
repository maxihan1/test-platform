// 리포터는 상대 import를 둘 수 없어 표시자를 따로 들고 있다. 두 벌이 어긋나면 러너가 결과 줄을 영영 못 찾는다

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PROGRESS_MARKER, RESULT_MARKER, STEP_ATTACHMENT } from './protocol.js';
import PlatformReporter, {
  RESULT_MARKER as REPORTER_MARKER,
  STEP_ATTACHMENT as REPORTER_ATTACHMENT,
} from './reporter.js';

describe('리포터가 들고 있는 표시자', () => {
  it('protocol.ts의 값과 같다', () => {
    expect(REPORTER_MARKER).toBe(RESULT_MARKER);
    expect(REPORTER_ATTACHMENT).toBe(STEP_ATTACHMENT);
  });
});

describe('리포터가 워커 출력을 넘겨받는다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('진행 줄을 진짜 stdout으로 다시 쓴다', () => {
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const 진행 = `${PROGRESS_MARKER}{"historyId":12,"seq":1,"title":"로그인 API를 호출한다"}\n`;

    new PlatformReporter().onStdOut(진행);

    expect(쓰기).toHaveBeenCalledTimes(1);
    expect(쓰기).toHaveBeenCalledWith(진행);
  });

  it('진행 줄이 아닌 보통 출력도 빠짐없이 다시 쓴다', () => {
    const 쓰기 = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const 리포터 = new PlatformReporter();
    const 문법오류 = 'SyntaxError: Unexpected identifier\n';
    const 스택 = Buffer.from('    at file:///work/tests/cases/TC-1.spec.ts:3:1\n');

    리포터.onStdOut(문법오류);
    리포터.onStdOut(스택);

    expect(쓰기.mock.calls.map(([조각]) => String(조각))).toEqual([문법오류, String(스택)]);
  });
});

describe('리포터가 케이스 파일을 못 읽은 오류를 넘겨받는다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onError 로 온 오류 문장을 stderr 로 흘린다 — 러너가 그것을 실패 사유로 싣는다', () => {
    const 쓰기 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const 문법오류 = 'SyntaxError: /tests/demo/DEMO-001.spec.ts: Unexpected token (3:12)\n\n> 3 |   const a = ;';

    new PlatformReporter().onError({ message: 문법오류 });

    expect(쓰기).toHaveBeenCalledWith(`${문법오류}\n`);
  });

  it('문장이 없는 오류는 값을 글자로 흘린다', () => {
    const 쓰기 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new PlatformReporter().onError({ value: 'boom' });

    expect(쓰기).toHaveBeenCalledWith('boom\n');
  });

  it('문장 · 스택 · 값이 다 없으면 아무것도 흘리지 않는다 — 「undefined」가 사유가 되지 않게', () => {
    const 쓰기 = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    new PlatformReporter().onError({});

    expect(쓰기).not.toHaveBeenCalled();
  });
});
