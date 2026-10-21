// 성능 실행 화면 머리 — 실행 중과 결과가 같은 머리 모양을 쓴다 (도메인/성능 §8.14)

import type { ReactNode } from 'react';

import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import type { 실행상세 } from './perfApi.js';
import { 유형글자 } from './PerfStepLoad.js';
import { 시각글 } from './perfRunView.js';

export function RunHead({ run, 앞, 덧, 행동 }: { run: 실행상세; 앞?: ReactNode; 덧?: string[]; 행동?: ReactNode }) {
  const t = use말();
  const 언어 = use언어();
  const 칸들 = [
    t(유형글자[run.config.testType].이름),
    run.env,
    t('에이전트 {수}대', { 수: run.config.agentIds.length }),
    run.startedAt === null ? t('아직 시작 전') : t('{시각} 시작', { 시각: 시각글(run.startedAt, 언어) }),
    ...(덧 ?? []),
  ];
  return (
    <Head
      위치={t('성능 테스트')}
      제목={`${run.scenarioName} ${run.code}`}
      부제={
        <>
          {앞}
          {칸들.join(' · ')}
        </>
      }
      행동={행동}
    />
  );
}
