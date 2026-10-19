import { describe, expect, it } from 'vitest';

import { 끝난글, 끝난줄만들기, 도는줄만들기, 보일줄들, 상대시각, 서랍목록, 안읽은수, 읽음열쇠, 줄최대, type 끝난줄, type 도는줄 } from './noticeView.js';
import { 끝난실행, 끝난작성, 도는E2E, 도는실행, 도는작성, 전에 } from './notice.fixture.js';

const 지금 = Date.now();
const 없음 = new Set<string>();

describe('도는 줄', () => {
  it('실행은 몇 건 중 몇 건인지와 막대 폭, 남은 시간 글을 같이 낸다', () => {
    const 줄 = 도는줄만들기(도는실행(2113), 지금, 'ko');
    expect(줄.앞글).toBe('RUN 2113 실행 중 · 기능 전체 382건 · 기능 테스트 · 대상 서버 qa · 12 / 40 완료 · 실패 2');
    expect(줄.막대).toEqual({ 통과: 10, 실패: 2, 미실행: 0, 남음: 28 });
    expect(줄.뒷글).toBe('남은 시간 계산 중');
    expect(줄.열기).toBe('#/runs/2113');
  });

  it('막대 색만으로 판정을 말하지 않는다 — 실패가 없으면 실패 글을 안 붙인다', () => {
    const 줄 = 도는줄만들기(도는실행(2114, { counts: { total: 40, pass: 12, fail: 0, na: 0, running: 28 } }), 지금, 'ko');
    expect(줄.앞글).toBe('RUN 2114 실행 중 · 기능 전체 382건 · 기능 테스트 · 대상 서버 qa · 12 / 40 완료');
  });

  it('E2E 실행은 단계 수와 지난 시간만 낸다 — 도중 진척을 몰라 막대도 남은 시간도 없다', () => {
    const 줄 = 도는줄만들기(도는E2E(2115), 지금, 'ko');
    expect(줄.앞글).toBe('E2E RUN 2115 실행 중 · 장바구니 결제 · 5단계 · 3분 지남');
    expect(줄.막대).toBeNull();
    expect(줄.뒷글).toBeNull();
    expect(줄.열기).toBe('#/runs/2115');
    expect(줄.종류).toBe('run');
  });

  it('작성은 몇 단계인지 · 지난 시간을 낸다. 평소 시간을 모르면 남은 시간 글이 없다', () => {
    const 줄 = 도는줄만들기(도는작성(5), 지금, 'ko');
    expect(줄.앞글).toBe('#5 작성 요청이 진행 중입니다 · 3 / 5 단계 스크립트 작성 · 12분 지남');
    expect(줄.뒷글).toBeNull();
    expect(줄.막대).toBeNull();
    expect(줄.열기).toBe('#/authoring/5');
  });

  it('평소 시간을 알면 남은 시간 글을 붙인다', () => {
    const 줄 = 도는줄만들기(도는작성(5, { expected: { ms: 20 * 60_000, samples: 6 } }), Date.now(), 'ko');
    expect(줄.뒷글).toMatch(/^약 8분 남음 · \d{2}:\d{2} 종료 예상 · 최근 6건 기준$/);
  });

  it('순서를 기다리는 작성은 단계도 시간도 없이 기다린다고만 적는다', () => {
    const 줄 = 도는줄만들기(도는작성(6, { status: 'PENDING', stage: null, startedAt: null }), 지금, 'ko');
    expect(줄.앞글).toBe('#6 작성 요청이 순서를 기다리고 있습니다');
  });

  it('모르는 단계 글이면 첫 단계로 본다', () => {
    expect(도는줄만들기(도는작성(7, { stage: null }), 지금, 'ko').앞글).toContain('1 / 5 단계 준비');
  });

  it('다섯 단계를 안 밟는 반영의 단계 글은 몇 단계라고 하지 않고 그 글만 적는다', () => {
    const 앞글 = 도는줄만들기(도는작성(8, { stage: 'CI 기다리는 중' }), 지금, 'ko').앞글;
    expect(앞글).toContain('CI 기다리는 중');
    expect(앞글).not.toContain('/ 5 단계');
  });

  it('다섯 단계를 안 밟는 작성(fiveSteps 가 false)은 「N / 5 단계」를 붙이지 않는다 — 단계 글이 있으면 그 글만, 없으면 아무것도 안 붙인다', () => {
    const 글 = (stage: string | null) => 도는줄만들기(도는작성(9, { fiveSteps: false, stage }), 지금, 'ko').앞글;
    expect(글('케이스를 만드는 중')).toBe('#9 작성 요청이 진행 중입니다 · 스크립트를 만드는 중 · 12분 지남');
    expect(글('CI 기다리는 중')).toBe('#9 작성 요청이 진행 중입니다 · CI 기다리는 중 · 12분 지남');
    expect(글(null)).toBe('#9 작성 요청이 진행 중입니다 · 12분 지남');
  });
});

describe('끝난 줄', () => {
  it('실행은 집계를 그대로 적는다 — 통과 · 실패 · 미실행 · 그중 미확정', () => {
    const 줄 = 끝난줄만들기(끝난실행(2127, { total: 10, pass: 6, fail: 1, na: 3, unconfirmed: 2 }), 'ko');
    expect(끝난글(줄)).toBe('RUN 2127 실행이 끝났습니다 · 기능 전체 382건 · 기능 테스트 · 대상 서버 qa · 6 통과 · 1 실패 · 3 미실행 · 그중 미확정 2건');
    expect(줄.모양).toBe('fail');
    expect(줄.열기라벨).toBe('결과 보기');
  });

  it('실패가 없으면 통과만 적고 통과 모양이다', () => {
    const 줄 = 끝난줄만들기(끝난실행(2126, { pass: 5 }), 'ko');
    expect(끝난글(줄)).toBe('RUN 2126 실행이 끝났습니다 · 기능 전체 382건 · 기능 테스트 · 대상 서버 qa · 5 통과');
    expect(줄.모양).toBe('pass');
  });

  it('사람이 멈춘 실행은 멈췄다고 적고 판정 색을 쓰지 않는다', () => {
    const 줄 = 끝난줄만들기(끝난실행(2121, {}, { status: 'ABORTED' }), 'ko');
    expect(줄.머리).toBe('RUN 2121 실행이 멈췄습니다');
    expect(줄.모양).toBe('halt');
  });

  it('작성 완료는 케이스 파일 수를 적고 PRD 확인 필요 수를 따로 둔다', () => {
    const 줄 = 끝난줄만들기(끝난작성(9, { caseFiles: 12, prdNeedsCheck: 3 }), 'ko');
    expect(끝난글(줄)).toBe('#9 작성 요청이 끝났습니다 · 케이스 파일 12개');
    expect(줄.확인필요).toBe(3);
    expect(줄.열기라벨).toBe('작성 결과');
  });

  it('파일 수가 null 이면 그 말을 뺀다', () => {
    expect(끝난글(끝난줄만들기(끝난작성(9, { caseFiles: null }), 'ko'))).toBe('#9 작성 요청이 끝났습니다');
  });

  it('실패는 오류 첫 줄을, 멈춤은 멈췄다고만 적는다', () => {
    expect(끝난글(끝난줄만들기(끝난작성(10, { status: 'FAILED', error: '자료를 못 받았다\n자세히', prdNeedsCheck: 4 }), 'ko'))).toBe(
      '#10 작성 요청이 실패했습니다 · 자료를 못 받았다',
    );
    const 멈춤 = 끝난줄만들기(끝난작성(11, { status: 'STOPPED' }), 'ko');
    expect(끝난글(멈춤)).toBe('#11 작성 요청이 멈췄습니다');
    expect(멈춤.확인필요).toBe(0);
  });
});

describe('보일 줄 고르기', () => {
  it('도는 것이 먼저다 — 실행 다음 작성, 각각 새것 먼저. 그다음 끝난 것 새것 먼저', () => {
    const 답 = {
      running: [도는작성(3), 도는실행(5), 도는실행(9), 도는작성(8)],
      recent: [],
    };
    const { 줄들 } = 보일줄들({ ...답, running: 답.running.slice(0, 3) }, 없음, 지금, 'ko');
    expect(줄들.map((줄) => 줄.열쇠)).toEqual(['run:9', 'run:5', 'authoring:3']);

    const 섞임 = 보일줄들(
      { running: [도는실행(5)], recent: [끝난실행(1, {}, { finishedAt: 전에(30) }), 끝난작성(2, { finishedAt: 전에(10) })] },
      없음,
      지금,
      'ko',
    );
    expect(섞임.줄들.map((줄) => 줄.열쇠)).toEqual(['run:5', 'authoring:2', 'run:1']);
  });

  it('E2E 실행은 케이스 실행 다음, 작성 앞에 선다', () => {
    const { 줄들 } = 보일줄들({ running: [도는작성(3), 도는E2E(7), 도는실행(5)], recent: [] }, 없음, 지금, 'ko');
    expect(줄들.map((줄) => (줄 as 도는줄).앞글.split(' · ')[0])).toEqual(['RUN 5 실행 중', 'E2E RUN 7 실행 중', '#3 작성 요청이 진행 중입니다']);
  });

  it('이미 읽은 것과 끝난 지 2시간이 지난 것은 줄로 안 알린다', () => {
    const 답 = { running: [], recent: [끝난실행(1), 끝난실행(2), 끝난실행(3, {}, { finishedAt: 전에(121) })] };
    const { 줄들 } = 보일줄들(답, new Set(['run:1']), 지금, 'ko');
    expect(줄들.map((줄) => 줄.열쇠)).toEqual(['run:2']);
  });

  it(`${String(줄최대)}줄을 넘으면 마지막 자리를 「외 N건」에 내준다`, () => {
    const 셋 = 보일줄들({ running: [도는실행(1), 도는실행(2), 도는실행(3)], recent: [] }, 없음, 지금, 'ko');
    expect(셋.줄들).toHaveLength(3);
    expect(셋.넘친수).toBe(0);

    const 다섯 = 보일줄들({ running: [도는실행(1), 도는실행(2), 도는실행(3)], recent: [끝난실행(4), 끝난실행(5)] }, 없음, 지금, 'ko');
    expect(다섯.줄들).toHaveLength(2);
    expect(다섯.넘친수).toBe(3);
  });

  it('보고 있는 실행의 도는 줄만 뺀다 — 끝난 줄과 다른 실행 · 작성은 그대로다', () => {
    const 답 = { running: [도는실행(5), 도는E2E(7), 도는작성(5)], recent: [끝난실행(5)] };
    expect(보일줄들(답, 없음, 지금, 'ko', 5).줄들.map((줄) => 줄.열쇠)).toEqual(['run:7', 'authoring:5', 'run:5']);
    // E2E 결과 머리에는 진행 글이 없어 E2E 줄은 보고 있어도 남는다
    expect(보일줄들(답, 없음, 지금, 'ko', 7).줄들.map((줄) => 줄.열쇠)).toContain('run:7');
  });

  it('알릴 것이 없으면 줄이 없다', () => {
    expect(보일줄들({ running: [], recent: [] }, 없음, 지금, 'ko')).toEqual({ 줄들: [], 넘친수: 0 });
  });

  it('도는 줄과 끝난 줄을 도는중 표지로 가른다', () => {
    const { 줄들 } = 보일줄들({ running: [도는실행(1)], recent: [끝난실행(2)] }, 없음, 지금, 'ko');
    expect((줄들[0] as 도는줄).도는중).toBe(true);
    expect((줄들[1] as 끝난줄).도는중).toBe(false);
  });
});

describe('서랍', () => {
  const recent = [끝난실행(1, {}, { finishedAt: 전에(300) }), 끝난작성(2, { finishedAt: 전에(10) }), 끝난실행(3, {}, { finishedAt: 전에(60) })];

  it('안 읽은 수는 읽은 열쇠를 뺀 수다. 2시간이 지난 것도 센다', () => {
    expect(안읽은수(recent, 없음)).toBe(3);
    expect(안읽은수(recent, new Set(['run:1', 'authoring:2']))).toBe(1);
  });

  it('새것 먼저 나열하고 종류나 안 읽음으로 거른다', () => {
    expect(서랍목록(recent, 없음, 'all').map(읽음열쇠)).toEqual(['authoring:2', 'run:3', 'run:1']);
    expect(서랍목록(recent, 없음, 'run').map(읽음열쇠)).toEqual(['run:3', 'run:1']);
    expect(서랍목록(recent, 없음, 'authoring').map(읽음열쇠)).toEqual(['authoring:2']);
    expect(서랍목록(recent, new Set(['run:3']), 'unread').map(읽음열쇠)).toEqual(['authoring:2', 'run:1']);
  });
});

describe('상대 시각', () => {
  const 기준 = new Date(2026, 9, 11, 15, 0, 0).getTime();
  const 이전 = (분: number) => new Date(기준 - 분 * 60_000).toISOString();

  it('1분 안은 방금, 1시간 안은 분 전, 오늘은 시간 전', () => {
    expect(상대시각(이전(0), 기준, 'ko')).toBe('방금');
    expect(상대시각(이전(5), 기준, 'ko')).toBe('5분 전');
    expect(상대시각(이전(125), 기준, 'ko')).toBe('2시간 전');
  });

  it('어제는 어제, 그 앞은 날짜다', () => {
    expect(상대시각(이전(16 * 60), 기준, 'ko')).toBe('어제');
    expect(상대시각(이전(3 * 24 * 60), 기준, 'ko')).toBe('10월 8일');
  });

  it('영어도 같은 꼴이다', () => {
    expect(상대시각(이전(5), 기준, 'en')).toBe('5m ago');
    expect(상대시각(이전(16 * 60), 기준, 'en')).toBe('Yesterday');
  });
});
