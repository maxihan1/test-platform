// 「PRD 관리 › 서비스 가이드」 화면 — 서비스 소개 · 정책 · 프로젝트 규칙을 글로 쓰고 문서로 첨부한다 (도메인/작성 §3.6 「★ 서비스 가이드」 · 2026-10-17 시안 A)
// 글 저장 · 파일 첨부 · 제거가 각각 한 판이다. 고치던 글은 파일을 첨부하고 제거해도 남는다 — 판이 바뀌어도 저장은 새 판 위에 한다

import { useState } from 'react';

import type { GuideFile, GuideSection as 구획 } from '@platform/kit';

import { ApiError } from './api.js';
import { 거절사유 } from './AuthoringNew.js';
import { guideApi, type 가이드글 } from './guideApi.js';
import { GuideSection, 구획들 } from './GuideSection.js';
import { GuideVersions } from './GuideVersions.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 떠나기상자 } from './leaveGuard.js';
import type { 판정 } from './role.js';
import { Failed, Loading, message, useAsync } from './ui.js';

export function Guide({ service, 할수 }: { service: string; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();
  const 판 = useAsync(() => guideApi.now(service), [service]);
  // 손댄 구획만 든다 — 다른 사람이 먼저 저장해 판을 다시 읽으면 손대지 않은 구획은 새 판 글이 보이고 그대로 보내진다
  const [초안, set초안] = useState<Partial<가이드글>>({});
  const [알림, set알림] = useState<{ ok: boolean; 글: string } | null>(null);
  const [기록, set기록] = useState(false);
  const [busy, setBusy] = useState(false);
  const 바뀜 = 판.data !== null && 구획들.some((s) => 초안[s] !== undefined && 초안[s] !== 판.data![s]);

  if (판.error !== null) return <Failed error={판.error} />;
  if (판.data === null) return <Loading />;
  const now = 판.data;
  // 보기는 작성 read, 고치기는 작성 write (도메인/인증 §7). 서버가 다시 막는다
  const 쓰나 = 할수('작성요청');
  const 글: 가이드글 = { intro: 초안.intro ?? now.intro, policy: 초안.policy ?? now.policy, rules: 초안.rules ?? now.rules };

  /** 새 판을 짓는다. 지금 판 번호를 넘겨 보낸다 — 그 사이 다른 저장이 있었으면 서버가 GUIDE_STALE 로 막는다 */
  async function 짓기(일: (baseVersion: number) => Promise<{ version: number }>): Promise<boolean> {
    setBusy(true);
    set알림(null);
    try {
      const { version } = await 일(now.version);
      set알림({ ok: true, 글: t('저장했습니다 (버전 {버전})', { 버전: version }) });
      await 판.reload();
      return true;
    } catch (err) {
      set알림({ ok: false, 글: message(err, 언어) });
      // 다른 사람이 먼저 저장했다 — 지금 판을 다시 읽어야 다시 보낼 수 있다. 고치던 글은 남는다
      if (err instanceof ApiError && err.code === 'GUIDE_STALE') await 판.reload();
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function 저장() {
    const 보낸 = 글;
    if (!(await 짓기((base) => guideApi.save(service, base, 보낸)))) return;
    // 저장이 오가는 동안 친 글자는 보낸 글과 다르다 — 그 구획은 초안에 남긴다
    set초안((전) => Object.fromEntries(구획들.filter((s) => 전[s] !== undefined && 전[s] !== 보낸[s]).map((s) => [s, 전[s]])));
  }

  function 더하기(section: 구획, file: File) {
    // 서버가 거절할 파일은 보내기 전에 거른다 — 자료 올리기와 같은 규칙이되 엑셀 · CSV 는 안 받는다 (도메인/작성 §7 「자료」)
    const 사유 = 거절사유(file, true);
    if (사유 !== null) return set알림({ ok: false, 글: t(사유) });
    void 짓기((base) => guideApi.addFile(service, section, base, file));
  }

  const 빼기 = (file: GuideFile) => void 짓기((base) => guideApi.removeFile(service, file.id, base));

  return (
    <>
      <Head
        위치={t('PRD 관리')}
        제목={t('애플리케이션 가이드')}
        부제={
          <>
            {t('테스트를 작성할 때 참고하는 애플리케이션 설명입니다')} ·{' '}
            {now.version === 0 ? t('아직 가이드가 없습니다') : t('버전 {버전} · 첨부 {건수}건', { 버전: now.version, 건수: now.files.length })}
          </>
        }
        행동={
          <>
            {now.version === 0 ? null : (
              <button className="btn ghost" aria-expanded={기록} onClick={() => set기록(!기록)}>
                {t('버전 기록')}
              </button>
            )}
            {쓰나 ? (
              <button className="btn" disabled={!바뀜 || busy} onClick={() => void 저장()}>
                {t('저장')}
              </button>
            ) : null}
          </>
        }
      />
      {알림 === null ? null : (
        <p role="status" className={알림.ok ? 'prd-note' : 'prd-note bad'}>
          {알림.글}
        </p>
      )}
      <p className="prd-note">{t('기대값은 요구사항(표준 기획서)에서만 옵니다. 가이드는 애플리케이션을 이해하고 테스트를 돌리는 데만 씁니다')}</p>
      {기록 ? <GuideVersions service={service} 지금판={now.version} /> : null}
      {/* 메뉴 · 고리 · 서비스 고르개로 떠나도 묻는다 — 앞 판은 창을 닫을 때만 물었다(점검 9.1) */}
      <떠나기상자 막나={바뀜} 버리기도 />
      {구획들.map((s) => (
        <GuideSection
          key={s}
          service={service}
          section={s}
          글={글[s]}
          files={now.files.filter((f) => f.section === s)}
          busy={busy}
          {...(쓰나
            ? {
                on글: (값: string) => set초안((전) => ({ ...전, [s]: 값 })),
                on더하기: (file: File) => 더하기(s, file),
                on빼기: 빼기,
              }
            : {})}
        />
      ))}
      {/* 세 구획을 다 쓰고 나면 저장 단추가 맨 위에 있다 — 글 칸 아래에도 둔다 (점검 9.3) */}
      {쓰나 ? (
        <div className="guide-savebar">
          {바뀜 ? <span className="note">{t('저장하지 않은 변경이 있습니다')}</span> : null}
          <button className="btn" disabled={!바뀜 || busy} onClick={() => void 저장()}>
            {t('저장')}
          </button>
        </div>
      ) : null}
    </>
  );
}
