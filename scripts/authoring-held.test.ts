// 끝내기 result.held 를 케이스 스키마에서 계산하는 순수 함수 검사 (도메인/작성 §3.6 「★ 보류 케이스」)

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { 보류목록, 스캔풀기, 스캔표시 } from './authoring-held.js';

const 스키마 = (s: z.ZodObject) => z.toJSONSchema(s, { io: 'input' });

const 보류케이스 = {
  tcId: 'MKT-041',
  name: '쿠폰 두 장',
  filePath: 'market/coupon.spec.ts',
  held: '판정 불가 — 쿠폰 중복 기준이 없다',
  paramSchema: 스키마(
    z.object({
      couponA: z.string().describe('첫 쿠폰 코드').default('WELCOME10'),
      couponB: z.string().describe('둘째 쿠폰 코드'),
      password: z.string().describe('관리자 비밀번호').meta({ secret: true }),
      wait: z.number().int().describe('기다릴 초'),
      tags: z.array(z.string()).describe('꼬리표'),
    }),
  ),
  expectedSchema: 스키마(
    z.object({
      total: z.number().describe('최종 결제 금액(원)'),
      shown: z.boolean().describe('안내가 보이나'),
      grade: z.enum(['GOLD', 'SILVER']).describe('등급'),
    }),
  ),
};

const 정식케이스 = {
  tcId: 'MKT-001',
  name: '로그인',
  filePath: 'market/login.spec.ts',
  paramSchema: 스키마(z.object({ id: z.string().describe('아이디') })),
  expectedSchema: { type: 'object', properties: {} },
};

describe('보류목록', () => {
  it('held 케이스만 골라 칸을 계산한다 — 기본값·비밀값·네 타입 밖 칸은 뺀다', () => {
    expect(보류목록([보류케이스, 정식케이스])).toEqual([
      {
        tcId: 'MKT-041',
        file: 'tests/market/coupon.spec.ts',
        kind: 'UNDECIDABLE',
        reason: '판정 불가 — 쿠폰 중복 기준이 없다',
        fields: [
          { side: 'params', key: 'couponB', description: '둘째 쿠폰 코드', type: 'string' },
          { side: 'params', key: 'wait', description: '기다릴 초', type: 'number' },
          { side: 'expected', key: 'total', description: '최종 결제 금액(원)', type: 'number' },
          { side: 'expected', key: 'shown', description: '안내가 보이나', type: 'boolean' },
          { side: 'expected', key: 'grade', description: '등급', type: 'enum', options: ['GOLD', 'SILVER'] },
        ],
      },
    ]);
  });

  it('비워 둬도 되는 칸(optional)은 사람이 채울 칸이 아니다 — K10 도 그 칸을 요구하지 않는다', () => {
    const 케이스 = {
      ...보류케이스,
      paramSchema: 스키마(z.object({ memo: z.string().describe('메모').optional() })),
      expectedSchema: { type: 'object', properties: {} },
    };
    expect(보류목록([케이스])[0]?.fields).toEqual([]);
  });

  it('머리가 「보류 —」이거나 모르는 머리면 ON_HOLD', () => {
    const 보류 = { ...정식케이스, held: '보류 — 관리자 계정이 없다' };
    const 모름 = { ...정식케이스, tcId: 'MKT-002', held: '전제 값 없음' };
    expect(보류목록([보류, 모름]).map((h) => h.kind)).toEqual(['ON_HOLD', 'ON_HOLD']);
  });

  it('모양이 틀린 것은 건너뛴다 — 자식이 만든 코드가 낸 값이라 믿지 않는다', () => {
    expect(보류목록([null, 'x', { tcId: 1, held: 'a' }, { ...정식케이스, held: '   ' }])).toEqual([]);
  });
});

describe('스캔풀기', () => {
  it('표시 뒤의 JSON 배열만 읽는다 — 케이스 파일이 찍은 글은 버린다', () => {
    expect(스캔풀기(`아무 글\n${스캔표시}[{"tcId":"A"}]\n`)).toEqual([{ tcId: 'A' }]);
  });

  it('표시가 없거나 배열이 아니면 null', () => {
    expect(스캔풀기('[1]')).toBeNull();
    expect(스캔풀기(`${스캔표시}{}`)).toBeNull();
    expect(스캔풀기(`${스캔표시}깨짐`)).toBeNull();
  });
});
