// k6 스크립트 생성기 — 문법이 맞고 · 사람이 쓴 값이 코드로 끼지 않고 · 유형마다 실행기가 맞는지, 구간 · 계정 나누기를 본다

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { generateScript, segments, splitRows, totalDuration } from './generator.js';
import type { Transaction } from './types.js';

const 로그인: Transaction = {
  name: '로그인',
  method: 'POST',
  url: '/api/login',
  headers: { 'content-type': 'application/json' },
  body: '{"id":"${username}","pw":"${password}"}',
  extract: [{ var: 'token', where: 'JSON', path: 'token', pick: 'FIRST' }],
  check: { status: [200], contains: 'token' },
  thinkTimeSec: 1,
};

function 문법검사(script: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'perfgen-'));
  const file = join(dir, 'script.mjs');
  writeFileSync(file, script);
  execFileSync(process.execPath, ['--check', file]);
}

describe('generateScript', () => {
  it('부하 테스트는 ramping-vus, 목표 TPS 는 ramping-arrival-rate 로 만든다', () => {
    const stages = [{ durationSec: 30, target: 10 }, { durationSec: 60, target: 10 }];
    const vus = generateScript({ transactions: [로그인], load: { basis: 'VUS', stages }, smoke: false, allowedHosts: ['shop.test'], maxVus: 500 });
    expect(vus).toContain('"executor":"ramping-vus"');
    expect(vus).toContain('"duration":"30s","target":10');
    문법검사(vus);
    const tps = generateScript({ transactions: [로그인, { ...로그인, name: '목록' }], load: { basis: 'TPS', stages }, smoke: false, allowedHosts: ['shop.test'], maxVus: 500 });
    expect(tps).toContain('"executor":"ramping-arrival-rate"');
    expect(tps).toContain('"timeUnit":"2s"');
    문법검사(tps);
  });

  it('스모크 테스트는 가상 사용자 1명 · 60초다', () => {
    const s = generateScript({ transactions: [로그인], load: { basis: 'VUS', stages: [{ durationSec: 600, target: 300 }] }, smoke: true, allowedHosts: ['shop.test'], maxVus: 500 });
    expect(s).toContain('"executor":"constant-vus","vus":1,"duration":"60s"');
    문법검사(s);
  });

  it('트랜잭션 이름 · 주소에 코드를 써도 JSON 글자로만 들어간다', () => {
    const 나쁜: Transaction = { name: "'); http.get('https://evil.test'); ('", method: 'GET', url: '/x`${1}`' };
    const s = generateScript({ transactions: [나쁜], load: { basis: 'VUS', stages: [{ durationSec: 10, target: 1 }] }, smoke: false, allowedHosts: ['shop.test'], maxVus: 1 });
    문법검사(s);
    expect(s).not.toContain("http.get('https://evil.test')\n");
    const tx = /const TX = (.*);\n/.exec(s)?.[1] ?? '';
    expect(JSON.parse(tx)[0].name).toBe(나쁜.name);
  });

  it('허용 호스트와 꼬리표 tx 를 싣는다', () => {
    const s = generateScript({ transactions: [로그인], load: { basis: 'VUS', stages: [{ durationSec: 10, target: 1 }] }, smoke: false, allowedHosts: ['shop.test', 'api.shop.test:8443'], maxVus: 1 });
    expect(s).toContain('const ALLOWED = ["shop.test","api.shop.test:8443"]');
    expect(s).toContain('tags: { tx: t.name }');
    expect(s).toContain('http.expectedStatuses(...t.check.status)');
  });

  it('실행 시간은 구간 시간의 합이다', () => {
    expect(totalDuration({ basis: 'VUS', stages: [{ durationSec: 30, target: 1 }, { durationSec: 90, target: 1 }] })).toBe(120);
  });
});

describe('segments', () => {
  it('에이전트 하나는 구간 전체다', () => {
    expect(segments([500])).toEqual([{ segment: '0:1', sequence: '0,1' }]);
  });

  it('최대 가상 사용자 비율로 나눈다', () => {
    expect(segments([500, 1000])).toEqual([
      { segment: '0:500/1500', sequence: '0,500/1500,1' },
      { segment: '500/1500:1', sequence: '0,500/1500,1' },
    ]);
  });
});

describe('splitRows', () => {
  it('계정 줄을 구간 크기대로 나눠 겹치지 않게 준다', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(splitRows(rows, [1, 2])).toEqual([['a', 'b'], ['c', 'd', 'e', 'f']]);
  });

  it('줄이 모자라 빈 몫이 생기면 그 에이전트는 모든 줄을 쓴다', () => {
    expect(splitRows(['a'], [1, 1])).toEqual([['a'], ['a']]);
  });
});
