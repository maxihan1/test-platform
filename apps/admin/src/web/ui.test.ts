import { describe, expect, it } from 'vitest';

import { PC_PLATFORM_LABEL } from '@platform/kit/types';

import { PLATFORM_LABEL, seconds, when, 실행디바이스들, 짧은디바이스글 } from './ui.js';

describe('시각과 소요시간은 언어를 따른다 (SPEC §8 다국어)', () => {
  const 그때 = '2026-09-22T05:13:00.000Z';

  it('한국어와 영어의 형식이 다르다', () => {
    const 한 = when(그때, 'ko');
    const 영 = when(그때, 'en');
    expect(한).not.toBe(영);
  });

  it('한국어는 년·월·일을 그 낱말로 적는다', () => {
    expect(when(그때, 'ko')).toMatch(/년.*월.*일/u);
  });

  it('영어에는 한글이 하나도 없다. 형식을 손으로 조립하면 여기가 안 바뀐다', () => {
    expect(when(그때, 'en')).not.toMatch(/[가-힣]/u);
  });

  it('값이 없으면 두 언어가 같은 줄표를 쓴다. 빈 칸을 지어내지 않는다', () => {
    expect(when(null, 'ko')).toBe('—');
    expect(when(null, 'en')).toBe('—');
  });

  it('소요시간도 언어를 탄다', () => {
    expect(seconds(1250, 'ko')).toBe('1.25초');
    expect(seconds(1250, 'en')).not.toMatch(/[가-힣]/u);
    expect(seconds(null, 'ko')).toBe('—');
  });
});

describe('PC 게임 결과 칸 (도메인/게임 §3.10 「윈도우 PC」 「패드별 결과」)', () => {
  it('돈 PC 값마다 칸 하나다 — 브라우저 칸을 끼우지 않는다', () => {
    expect(실행디바이스들([{ platform: 'windows-xbox' }, { platform: 'windows' }, { platform: 'windows-ps5' }])).toEqual(['windows', 'windows-ps5', 'windows-xbox']);
  });

  it('웹 실행은 그대로 PC · 모바일 두 칸이다', () => {
    expect(실행디바이스들([{ platform: 'desktop' }])).toEqual(['desktop', 'mobile']);
  });

  it('화면에 글자로 둔 PC 디바이스 이름이 kit 표와 같다 — 영어 표가 화면 글자를 키로 찾아 화면 쪽에 따로 둔다', () => {
    for (const [값, 이름] of Object.entries(PC_PLATFORM_LABEL)) expect(PLATFORM_LABEL[값 as keyof typeof PC_PLATFORM_LABEL]).toBe(이름);
  });

  it('좁은 자리는 패드 이름만 쓰고 키보드 칸은 「Windows」 그대로다', () => {
    expect(짧은디바이스글('windows-ps5')).toBe('PS5 패드');
    expect(짧은디바이스글('windows')).toBe('Windows');
    expect(짧은디바이스글('android')).toBe('Android 앱');
  });
});
