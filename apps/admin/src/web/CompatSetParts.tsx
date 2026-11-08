// 호환성 세트 화면의 구획 넷 — 디바이스 · 케이스 · 화면 커버리지 · 예상 소요 시간 (도메인/호환성 §8.17 ②). 상태는 CompatSet.tsx 가 든다

import type { CompatAuto, CompatDevice, CompatPreview, CompatSetDetail, CompatSetDevice } from './compatApi.js';
import { 디바이스요약글, 요약, 커버율 } from './compatView.js';
import { use말 } from './i18n.js';

/** 자동 선택은 앞 넷만 줄로 보이고 나머지는 「외 N건 · 화면 M개」로 접는다 (시안 ②) */
const 보이는자동 = 4;

export function 디바이스구획({ 고른, 팜, 팜오류, 쓰나, 열기 }: { 고른: CompatSetDevice[]; 팜: CompatDevice[] | null; 팜오류: string | null; 쓰나: boolean; 열기: () => void }) {
  const t = use말();
  const 팜사본 = new Map((팜 ?? []).map((d) => [d.serial, d]));
  const 읽은것 = 고른.flatMap((d) => { const x = 팜사본.get(d.serial); return x === undefined ? [] : [x]; });
  const 셈 = 요약(읽은것);
  // 요약은 팜에 있는 디바이스로만 센다 — 빠진 수를 같이 보여 머리 「N대」와 숫자가 맞게 한다
  const 빠진수 = 팜 === null ? 0 : 고른.length - 읽은것.length;
  return (
    <section className="compat-panel" aria-labelledby="cs-dev">
      <div className="compat-ph">
        <h2 id="cs-dev">{t('디바이스 {수}대', { 수: 고른.length })}</h2>
        {쓰나 ? (
          <button type="button" className="btn ghost" disabled={팜 === null} onClick={열기}>
            {t('디바이스 선택')}
          </button>
        ) : null}
      </div>
      {팜오류 === null ? null : <p className="compat-err">{팜오류}</p>}
      {고른.length === 0 ? (
        <p className="compat-faint compat-pad">{t('아직 선택한 디바이스가 없습니다. 「디바이스 선택」에서 선택합니다')}</p>
      ) : (
        <>
          {팜 === null ? null : (
          <div className="compat-pills compat-pad">
            {빠진수 === 0 ? null : <span className="compat-tag">{t('등록에서 빠짐 {수}', { 수: 빠진수 })}</span>}
            {디바이스요약글(셈, t).map((글) => (
              <span key={글} className="compat-auto">
                {글}
              </span>
            ))}
            {/* 원격 접기가 없어 폴더블도 꽂힌 상태 그대로 한 번이다 (§3.13 「디바이스 · 점검 상태」 · 2026-11-07 사용자) */}
            {셈.폴더블 === 0 ? null : <span className="compat-auto">{t('폴더블 {수}대는 꽂힌 상태 그대로 한 번 점검합니다', { 수: 셈.폴더블 })}</span>}
          </div>
          )}
          {/* 고른 차례가 실행 순서다 */}
          <ol className="compat-devs compat-pad" aria-label={t('실행 순서')}>
            {고른.map((d) => (
              <li key={d.serial} className="compat-scr" title={d.name}>
                <span className="mono">{d.model}</span>
                {팜 !== null && !팜사본.has(d.serial) ? <span className="compat-tag">{t('등록에서 빠짐')}</span> : null}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function 케이스줄({ tcId, 이름, 꼬리 }: { tcId: string; 이름: string; 꼬리: React.ReactNode }) {
  return (
    <div className="compat-row">
      <span className="mono compat-tc">{tcId}</span>
      <span className="compat-grow">{이름}</span>
      {꼬리}
    </div>
  );
}

export function 케이스구획({
  auto,
  직접,
  이름들,
  웹,
  쓰나,
  더하기,
  빼기,
}: {
  auto: CompatAuto[];
  /** 자동 선택에 안 든 직접 추가 — 자동 선택에도 들면 자동 선택 쪽으로 센다 (§3.13 「호환성 세트」) */
  직접: string[];
  /** null 은 카탈로그에 없는 케이스 — 세트에 남고 실행 때 건너뛴다 */
  이름들: ReadonlyMap<string, string | null>;
  웹: boolean;
  쓰나: boolean;
  더하기: () => void;
  빼기: (tcId: string) => void;
}) {
  const t = use말();
  const 접힌 = auto.slice(보이는자동);
  const 도는직접 = 직접.filter((c) => 이름들.get(c) !== null);
  return (
    <section className="compat-panel" aria-labelledby="cs-case">
      <div className="compat-ph">
        <h2 id="cs-case">{t('케이스 {수}', { 수: auto.length + 도는직접.length })}</h2>
        <small className="compat-faint">{t('자동 선택은 실행할 때마다 다시 계산합니다')}</small>
      </div>
      {auto.length + 도는직접.length === 0 ? (
        <p className="compat-pad">{웹 ? t('실제 디바이스에서 실행되는 모바일 웹 케이스가 없습니다') : t('디바이스에서 실행되는 케이스가 없습니다')}</p>
      ) : null}
      {auto.length === 0 ? null : (
        <>
          <h3 className="compat-sub">{t('자동 선택 · 화면 커버리지 최대 · 최소 케이스')}</h3>
          {auto.slice(0, 보이는자동).map((a) => (
            <케이스줄 key={a.tcId} tcId={a.tcId} 이름={a.name} 꼬리={<span className="compat-auto">{t('추가 커버 화면 {수}', { 수: a.adds })}</span>} />
          ))}
          {접힌.length === 0 ? null : (
            <div className="compat-row compat-faint">{t('외 {건}건 · 화면 {수}개', { 건: 접힌.length, 수: 접힌.reduce((합, a) => 합 + a.adds, 0) })}</div>
          )}
        </>
      )}
      <h3 className="compat-sub">{t('직접 추가')}</h3>
      {직접.map((tcId) => (
        <케이스줄
          key={tcId}
          tcId={tcId}
          이름={이름들.get(tcId) ?? ''}
          꼬리={
            <>
              {이름들.get(tcId) === null ? <span className="compat-tag">{t('케이스가 없어 실행 때 건너뜀')}</span> : <span className="compat-tag">{t('직접 추가')}</span>}
              {쓰나 ? (
                <button type="button" className="btn ghost small" aria-label={t('{번호} 제외', { 번호: tcId })} onClick={() => 빼기(tcId)}>
                  {t('제외')}
                </button>
              ) : null}
            </>
          }
        />
      ))}
      <div className="compat-row">
        {쓰나 ? (
          <button type="button" className="btn ghost small" onClick={더하기}>
            {t('케이스 추가')}
          </button>
        ) : null}
        <span className="compat-faint">{t('자동 선택 케이스는 제외할 수 없습니다')}</span>
      </div>
    </section>
  );
}

export function 커버리지구획({ 셈 }: { 셈: CompatPreview }) {
  const t = use말();
  const { covered, total, fallback } = 셈.coverage;
  return (
    <section className="compat-panel" aria-labelledby="cs-scr">
      <div className="compat-ph">
        <h2 id="cs-scr">
          {t('화면 커버리지')}{' '}
          <span className="mono compat-faint">
            {covered} / {total} ({커버율(셈.coverage)}%)
          </span>
        </h2>
        <small className="compat-faint">{t('전체 화면 {전체}개 중 {덮음}개 커버', { 전체: total, 덮음: covered })}</small>
      </div>
      <div className="compat-pad">
        {fallback ? <p className="compat-faint">{t('전체 화면 목록이 없어 케이스가 아는 화면으로 집계합니다')}</p> : null}
        {셈.uncovered.length === 0 ? (
          <p className="compat-faint">{t('미커버 화면이 없습니다')}</p>
        ) : (
          <>
            <h3 className="compat-sub">{t('미커버 화면 {수} · 호환성 점검 불가', { 수: 셈.uncovered.length })}</h3>
            <div className="compat-pills">
              {셈.uncovered.map((u) => (
                <span key={u.key} className="compat-scr" title={u.key}>
                  {u.name}
                </span>
              ))}
            </div>
            <p className="compat-faint">{t('해당 화면을 지나는 TC 를 작성하면 다음 실행부터 자동 포함됩니다')}</p>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * 예상은 저장한 세트로만 센다 — 케이스마다 최근 소요를 서버가 읽어서다. 고친 뒤에는 저장해야 다시 센다.
 * 케이스 수는 서버가 실제로 돌릴 수(runs ÷ 점검 상태)다 — 카탈로그에 없는 직접 추가는 서버도 빼고, 케이스 구획 머리도 뺀다
 */
export function 예상구획({ 예상, 상태수 }: { 예상: CompatSetDetail['estimate'] | null; 상태수: number }) {
  const t = use말();
  return (
    <section className="compat-panel compat-eta" aria-labelledby="cs-eta">
      <h2 id="cs-eta">{t('예상 소요 시간')}</h2>
      {예상 === null ? (
        <p className="compat-faint">{t('저장하면 예상 소요 시간을 계산합니다')}</p>
      ) : (
        <>
          <p>{t('케이스 {케이스} × 점검 상태 {상태} = {회}회 실행', { 케이스: 상태수 === 0 ? 0 : Math.round(예상.runs / 상태수), 상태: 상태수, 회: 예상.runs })}</p>
          <p>{t('테스트 약 {분}분 · AI 점검 완료까지 약 {점검}분 추가', { 분: 예상.testMinutes, 점검: 예상.checkMinutes })}</p>
        </>
      )}
      <p className="compat-faint">{t('순차 실행이라 대기 중인 디바이스는 다른 테스트에 쓸 수 있습니다')}</p>
    </section>
  );
}
