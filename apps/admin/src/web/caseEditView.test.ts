import { afterEach, describe, expect, it, vi } from 'vitest';

import { 고칠것검사 } from '../authoring/edit.js';
import { api, ApiError, type CaseRow } from './api.js';
import { 고치기오류문장, 고칠칸들, 기대값한줄, 바꾼값, 저장값지울칸 } from './caseEditView.js';
import { initialText } from './schema.js';

const 기대스키마 = {
  type: 'object',
  properties: {
    state: { type: 'string', description: '주문 상태', default: '결제 완료' },
    count: { type: 'integer', description: '상품 수', default: 1, minimum: 1 },
    shown: { type: 'boolean', description: '배너 보임', default: true },
    grade: { type: 'string', enum: ['GOLD', 'SILVER'], description: '등급', default: 'GOLD' },
    items: { type: 'array', description: '상품 목록', default: [] },
    either: { anyOf: [{ type: 'string' }, { type: 'number' }], description: '둘 중 하나', default: 'a' },
    password: { type: 'string', description: '비밀번호', default: 'pw' },
    hidden: { type: 'string', description: '숨김', default: 'x', secret: true },
  },
} as unknown as CaseRow['expectedSchema'];

function 케이스(덮을것: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId: 'XEW-001',
    name: '고치기 케이스',
    platforms: ['desktop'],
    precondition: [],
    filePath: 'tests/XEW-001.spec.ts',
    paramSchema: { type: 'object', properties: {} } as unknown as CaseRow['paramSchema'],
    expectedSchema: 기대스키마,
    isActive: true,
    scannedAt: '2026-10-01T00:00:00.000Z',
    ...덮을것,
  };
}

describe('코드 기본값을 바꿀 수 있는 칸', () => {
  it('글자 · 수 · 정수 · 참거짓 · 선택지 다섯 꼴만 보이고 코드 기본값으로 채워진다', () => {
    const 칸들 = 고칠칸들(기대스키마);
    expect(칸들.map((f) => f.key)).toEqual(['state', 'count', 'shown', 'grade']);
    expect(initialText(칸들)).toEqual({ state: '결제 완료', count: '1', shown: 'true', grade: 'GOLD' });
  });

  it('비밀값 칸은 표시가 있든 이름뿐이든 안 보인다', () => {
    const 키들 = 고칠칸들(기대스키마).map((f) => f.key);
    expect(키들).not.toContain('password');
    expect(키들).not.toContain('hidden');
  });

  it('보이는 칸은 서버 검사가 받는 칸과 같다. 화면만 넓으면 보내고 나서야 거절된다', () => {
    const properties = (기대스키마 as { properties: Record<string, { default: unknown }> }).properties;
    const 판 = {
      케이스들: new Map([['XEW-001', { tcId: 'XEW-001', active: true, unconfirmed: null, expectedSchema: 기대스키마 }]]),
      접두사: 'XEW',
      비밀번호들: [],
    };
    const 서버가받는칸 = Object.entries(properties)
      .filter(([key, prop]) => !('error' in 고칠것검사({ edits: [{ tcId: 'XEW-001', expected: { [key]: prop.default } }] }, 판)))
      .map(([key]) => key);
    expect(고칠칸들(기대스키마).map((f) => f.key)).toEqual(서버가받는칸);
  });

  it('저장값이 있어도 칸은 저장값이 아니라 코드 기본값으로 열린다', () => {
    const 칸들 = 고칠칸들(기대스키마);
    expect(칸들.find((f) => f.key === 'state')?.saved).toBeUndefined();
  });
});

describe('바꾼 칸만 보낸다', () => {
  it('손대지 않았으면 빈 값이다', () => {
    const 칸들 = 고칠칸들(기대스키마);
    expect(바꾼값(칸들, initialText(칸들))).toEqual({});
  });

  it('바꾼 칸만 명세 타입으로 되돌려 싣는다', () => {
    const 칸들 = 고칠칸들(기대스키마);
    const 글 = { ...initialText(칸들), count: '3', shown: 'false' };
    expect(바꾼값(칸들, 글)).toEqual({ count: 3, shown: false });
  });

  it('바꿨다가 원래대로 돌려 놓으면 안 싣는다', () => {
    const 칸들 = 고칠칸들(기대스키마);
    const 글 = { ...initialText(칸들), state: '결제 완료' };
    expect(바꾼값(칸들, 글)).toEqual({});
  });
});

describe('반영되면 지워지는 저장값', () => {
  it('바꾼 칸 가운데 저장값이 있는 칸의 이름만 낸다', () => {
    const 행 = 케이스({
      savedInput: {
        params: {},
        expected: { state: '배송 중', grade: 'SILVER' },
        savedSecrets: { params: [], expected: [] },
        savedBy: 'tester',
        savedAt: '2026-10-01T00:00:00.000Z',
      },
    });
    const 칸들 = 고칠칸들(행.expectedSchema);
    expect(저장값지울칸(행, 칸들, ['state', 'count'])).toEqual(['주문 상태']);
  });

  it('저장값이 없으면 아무것도 안 낸다', () => {
    const 행 = 케이스();
    expect(저장값지울칸(행, 고칠칸들(행.expectedSchema), ['state'])).toEqual([]);
  });
});

describe('지금 기대값 한 줄', () => {
  it('코드 기본값을 라벨과 같이 적고 비밀값은 가린다', () => {
    const 줄 = 기대값한줄(기대스키마, 'ko');
    expect(줄).toContain('주문 상태 결제 완료');
    expect(줄).toContain('배너 보임 예');
    expect(줄).not.toContain('pw');
  });

  it('기대값 칸이 없으면 없다고 적는다', () => {
    expect(기대값한줄({ type: 'object', properties: {} } as unknown as CaseRow['expectedSchema'], 'ko')).toBe('기대결과 없음');
  });
});

describe('고치기 오류 문장', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('겹치는 고치기는 그 요청 번호를 같이 보인다', () => {
    const 글 = 고치기오류문장(new ApiError(409, 'EDIT_OPEN', '12,15'), 'ko');
    expect(글).toContain('#12');
    expect(글).toContain('#15');
  });

  it('서버가 번호 배열로 준 겹침도 통신 계층을 거쳐 #번호로 보인다', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'EDIT_OPEN', detail: [12, 15] }) } as Response),
    );
    const 오류 = await api.createAuthoringEdit('XEW', [{ tcId: 'XEW-001', delete: true }]).catch((err: unknown) => err);
    expect(고치기오류문장(오류, 'ko')).toContain('#12 · #15');
  });

  it('그 밖의 오류는 공통 문장을 탄다', () => {
    expect(고치기오류문장(new ApiError(400, 'BAD_EDIT', 'XEW-001.state'), 'ko')).toContain('XEW-001.state');
  });
});
