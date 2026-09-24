// 작성 에이전트의 모델·effort·예비 모델 설정과 Claude CLI 최신화 판단 검사
import { describe, expect, it } from 'vitest';

import { 모델설정, 모델인자, 버전뽑기, 업데이트인자, 업데이트할까, 점검통과, 한도걸렸나 } from './authoring-model.js';

describe('모델설정 — .env 에서 읽는다', () => {
  it('비면 opus · high · 예비 sonnet 이다 (2026-09-24 사용자 결정)', () => {
    expect(모델설정({})).toEqual({ model: 'opus', effort: 'high', fallback: 'sonnet' });
  });

  it('값을 주면 그것을 쓴다. 전체 이름도 된다', () => {
    expect(
      모델설정({ AUTHORING_MODEL: 'claude-opus-5-5', AUTHORING_EFFORT: 'medium', AUTHORING_FALLBACK_MODEL: 'haiku' }),
    ).toEqual({ model: 'claude-opus-5-5', effort: 'medium', fallback: 'haiku' });
  });

  it('effort 가 CLI 가 받는 다섯 밖이면 거부 사유를 낸다', () => {
    expect(모델설정({ AUTHORING_EFFORT: 'ultra' })).toEqual({ 까닭: expect.stringContaining('AUTHORING_EFFORT') });
  });

  it('모델 이름에 공백·세미콜론 같은 글자가 있으면 거부한다', () => {
    expect(모델설정({ AUTHORING_MODEL: 'opus; rm -rf /' })).toEqual({ 까닭: expect.stringContaining('AUTHORING_MODEL') });
    expect(모델설정({ AUTHORING_FALLBACK_MODEL: 'son net' })).toEqual({
      까닭: expect.stringContaining('AUTHORING_FALLBACK_MODEL'),
    });
  });

  it('예비가 본 모델과 같으면 예비를 뺀다 — CLI 가 같은 모델을 예비로 받지 않는다', () => {
    expect(모델설정({ AUTHORING_MODEL: 'sonnet' })).toEqual({ model: 'sonnet', effort: 'high', fallback: null });
  });

  it('예비를 끄려면 none 을 적는다', () => {
    expect(모델설정({ AUTHORING_FALLBACK_MODEL: 'none' })).toEqual({ model: 'opus', effort: 'high', fallback: null });
  });
});

describe('모델인자 — claude 에 붙는 깃발', () => {
  it('셋을 다 싣는다', () => {
    expect(모델인자({ model: 'opus', effort: 'high', fallback: 'sonnet' })).toEqual([
      '--model',
      'opus',
      '--effort',
      'high',
      '--fallback-model',
      'sonnet',
    ]);
  });

  it('예비가 없으면 그 깃발을 안 싣는다', () => {
    expect(모델인자({ model: 'opus', effort: 'low', fallback: null })).toEqual(['--model', 'opus', '--effort', 'low']);
  });
});

describe('한도걸렸나 — 예비 모델은 한도를 넘겨 주지 않는다', () => {
  it('구독 한도 문구를 알아본다', () => {
    expect(한도걸렸나('Claude AI usage limit reached|1760000000')).toBe(true);
    expect(한도걸렸나("You've hit your limit · resets 3pm")).toBe(true);
  });

  it('평범한 실패는 한도가 아니다', () => {
    expect(한도걸렸나('Error: tests failed')).toBe(false);
  });
});

describe('CLI 최신화', () => {
  const 하루 = 24 * 60 * 60 * 1000;

  it('처음(마지막이 없음)이고 도는 작업이 없으면 한다', () => {
    expect(업데이트할까(1_000, null, 0)).toBe(true);
  });

  it('24시간이 지났어도 도는 작업이 있으면 미룬다 — 도는 claude 의 판을 바꾸지 않는다', () => {
    expect(업데이트할까(하루 + 10, 0, 1)).toBe(false);
  });

  it('24시간이 안 지났으면 안 한다', () => {
    expect(업데이트할까(하루 - 1, 0, 0)).toBe(false);
    expect(업데이트할까(하루, 0, 0)).toBe(true);
  });

  it('판은 기본 stable 이다 (2026-09-24 게이트 1)', () => {
    expect(업데이트인자(undefined)).toEqual(['install', '-g', '@anthropic-ai/claude-code@stable']);
  });

  it('latest · 정확한 판을 받는다', () => {
    expect(업데이트인자('latest')).toEqual(['install', '-g', '@anthropic-ai/claude-code@latest']);
    expect(업데이트인자('2.1.280')).toEqual(['install', '-g', '@anthropic-ai/claude-code@2.1.280']);
  });

  it('그 밖의 값은 거부한다 — npm 인자에 끼우는 값이다', () => {
    expect(업데이트인자('next --registry=http://evil')).toBeNull();
    expect(업데이트인자('^2')).toBeNull();
  });

  it('버전 글에서 판 번호를 뽑는다', () => {
    expect(버전뽑기('2.1.280 (Claude Code)\n')).toBe('2.1.280');
    expect(버전뽑기('command not found')).toBeNull();
  });

  it('점검 — 우리가 쓰는 깃발이 도움말에 다 있어야 통과다', () => {
    const 도움말 = '--model <m>\n--effort <l>\n--fallback-model <m>\n--disallowedTools <t>\n--permission-mode <p>\n';
    expect(점검통과(도움말)).toBe(true);
    expect(점검통과(도움말.replace('--disallowedTools', '--blockTools'))).toBe(false);
  });
});
