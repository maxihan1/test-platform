// 「PRD 관리 › 서비스 가이드」 화면 — 서비스 소개 · 정책 · 작업 규칙을 글로 쓰고 문서로 첨부한다 (도메인/작성 §3.6 「★ 서비스 가이드」 · 2026-11-11 시안 GuideA)
// 평소에는 문서처럼 읽히고 구획마다 「수정」으로 연다. 글 저장 · 파일 첨부 · 제거가 각각 한 버전이다 — 본문과 상태는 GuideBody 가 맡는다

import { useState } from 'react';

import { GuideBody, useGuideEdit } from './GuideBody.js';
import { GuideVersions } from './GuideVersions.js';
import { Head, use지금앱 } from './Head.js';
import { use말 } from './i18n.js';
import { 종류 } from './kind.js';
import { 떠나기상자 } from './leaveGuard.js';
import type { 판정 } from './role.js';
import { Failed, Loading } from './ui.js';

export function Guide({ service, 할수 }: { service: string; 할수: 판정 }) {
  const t = use말();
  const { 가이드, 가이드예 } = 종류(use지금앱()?.kind);
  const 상태 = useGuideEdit(service);
  const [기록, set기록] = useState(false);

  if (상태.오류 !== null) return <Failed error={상태.오류} />;
  const now = 상태.now;
  if (now === null) return <Loading />;
  // 보기는 작성 read, 고치기는 작성 write (도메인/인증 §7). 서버가 다시 막는다
  const 쓰나 = 할수('작성요청');

  return (
    <>
      <Head
        위치={t('PRD 관리')}
        제목={t(가이드)}
        부제={
          <>
            {t('테스트를 작성할 때 참고하는 애플리케이션 설명입니다')} ·{' '}
            {now.version === 0 ? t('아직 가이드가 없습니다') : t('버전 {버전} · 첨부 {건수}건', { 버전: now.version, 건수: now.files.length })}
          </>
        }
        행동={
          now.version === 0 ? undefined : (
            <button className="btn ghost" aria-expanded={기록} onClick={() => set기록(!기록)}>
              {t('버전 기록')}
            </button>
          )
        }
      />
      <p className="prd-note">{t('기대 결과는 요구사항(표준 기획서)에서만 옵니다. 가이드는 애플리케이션을 이해하고 테스트를 실행하는 데만 씁니다')}</p>
      {기록 ? <GuideVersions service={service} 지금판={now.version} /> : null}
      {/* 메뉴 · 고리 · 서비스 고르개로 떠나도 묻는다 — 앞 판은 창을 닫을 때만 물었다(점검 9.1) */}
      <떠나기상자 막나={상태.바뀜} 버리기도 />
      <GuideBody service={service} 가이드={상태} 쓰나={쓰나} 예={가이드예} />
    </>
  );
}
