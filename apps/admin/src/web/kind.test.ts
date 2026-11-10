// 애플리케이션 목록 차례 검사 — 대표 먼저, 나머지는 종류 차례 (SPEC 공통/5-화면공통 §8 「왼쪽 줄」 「차례」)

import { describe, expect, it } from 'vitest';

import type { ServiceRow } from './api.js';
import { 종류차례로 } from './kind.js';

const 앱 = (prefix: string, kind: ServiceRow['kind'], primary?: boolean): ServiceRow => ({
  id: prefix.length,
  prefix,
  name: prefix,
  color: '#667788',
  projectId: 1,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'read', authoring: 'read' },
  kind,
  ...(primary === undefined ? {} : { primary }),
});

describe('종류차례로', () => {
  it('대표가 없으면 웹 · 앱 · 게임 · API 차례이고 같은 종류 안은 받은 차례다', () => {
    const 목록 = [앱('API1', 'API'), 앱('WEB1', 'SCREEN'), 앱('APP1', 'APP'), 앱('WEB2', 'SCREEN')];
    expect(종류차례로(목록).map((it) => it.prefix)).toEqual(['WEB1', 'WEB2', 'APP1', 'API1']);
  });

  it('대표는 종류와 상관없이 맨 위이고 나머지 차례는 그대로다', () => {
    const 목록 = [앱('API1', 'API', true), 앱('WEB1', 'SCREEN', false), 앱('APP1', 'APP'), 앱('WEB2', 'SCREEN')];
    expect(종류차례로(목록).map((it) => it.prefix)).toEqual(['API1', 'WEB1', 'WEB2', 'APP1']);
  });
});
