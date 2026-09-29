// 계정 편집기의 운영 · 서비스와 권한 · 대시보드 고르개와 목록 줄의 권한 요약 (도메인/인증 §8.8, 시안 B)

import type { SettingsServiceRow, UserRow, 배정 } from './api.js';
import { use말 } from './i18n.js';
import type { 기능, 등급, 칸 } from './role.js';
import { 계정요약, 권한경고, 기능순서 } from './settingsView.js';

// 값이 곧 번역 키다. `실행` 은 다른 화면에서 버튼(Run)이라 꼬리를 달아 따로 옮긴다
const 기능이름: Record<기능, string> = { cases: '케이스', runs: '실행§권한', authoring: '작성' };
const 칸이름: Record<칸, string> = { none: '안 씀', read: '읽기', write: '쓰기' };
// 켜자마자 쓰기를 주면 사람이 모르고 넘긴다. 처음은 읽기다 (§8.8)
const 처음칸 = { cases: 'read', runs: 'read', authoring: 'read' } as const;

function 칸고르개<T extends 칸>({ 이름, 값, 값들, on }: { 이름: string; 값: T; 값들: T[]; on: (v: T) => void }) {
  const t = use말();
  return (
    <div className="set-seg" role="group" aria-label={이름}>
      {값들.map((v) => (
        <button key={v} type="button" className="chip" aria-pressed={값 === v} onClick={() => on(v)}>
          {t(칸이름[v])}
        </button>
      ))}
    </div>
  );
}

export function PermissionPicker({
  services,
  role,
  onRole,
  마지막운영,
  배정들,
  on배정들,
  dashboard,
  onDashboard,
}: {
  services: SettingsServiceRow[];
  role: 등급;
  onRole: (v: 등급) => void;
  /** 맞으면 운영을 끄는 길을 아예 안 그린다 (§3.5 · §7 LAST_ADMIN) */
  마지막운영: boolean;
  배정들: 배정[];
  on배정들: (v: 배정[]) => void;
  dashboard: 'none' | 'read';
  onDashboard: (v: 'none' | 'read') => void;
}) {
  const t = use말();
  const 운영 = role === 'admin';
  // 내려 둔 서비스는 고를 자리에서 뺀다. 이미 받은 배정은 배정들에 남아 저장 때 그대로 간다
  const 보일것 = services.filter((s) => s.isActive);

  function 칸바꾸기(prefix: string, f: 기능, v: 칸) {
    on배정들(배정들.map((it) => (it.prefix === prefix ? { ...it, permissions: { ...it.permissions, [f]: v } } : it)));
  }

  return (
    <>
      <div className="field">
        <span className="field-label">{t('운영')}</span>
        <div>
          {마지막운영 ? (
            <div className="hint">{t('마지막 운영 계정이라 운영을 끌 수 없습니다. 먼저 다른 사람을 운영으로 올립니다')}</div>
          ) : (
            <label className="set-pick">
              <input
                type="checkbox"
                checked={운영}
                onChange={(e) => onRole(e.target.checked ? 'admin' : 'member')}
              />
              {t('운영 (배정된 서비스 전부 + 설정 · 머지)')}
            </label>
          )}
          {운영 ? (
            <div className="hint">{t('운영 계정은 배정된 서비스에서 모든 기능을 씁니다. 켜 둘 서비스만 고르세요.')}</div>
          ) : null}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t('서비스와 권한')}</span>
        <div className="set-perms">
          {보일것.length === 0 ? <span className="hint">{t('먼저 서비스를 만듭니다')}</span> : null}
          {보일것.map((s) => {
            const 내것 = 배정들.find((it) => it.prefix === s.prefix);
            const 경고 = 내것 === undefined ? null : 권한경고(내것.permissions);
            return (
              <div key={s.prefix} className="set-perm">
                <label className="set-pick">
                  <input
                    type="checkbox"
                    checked={내것 !== undefined}
                    onChange={(e) =>
                      on배정들(
                        e.target.checked
                          ? [...배정들, { prefix: s.prefix, permissions: { ...처음칸 } }]
                          : 배정들.filter((it) => it.prefix !== s.prefix),
                      )
                    }
                  />
                  {s.name} <span className="set-sub">{s.prefix}-</span>
                </label>
                {내것 === undefined || 운영
                  ? null
                  : 기능순서.map((f) => (
                      <div key={f} className="set-perm-row">
                        <span className="set-sub">{t(기능이름[f])}</span>
                        <칸고르개
                          이름={`${s.name} ${t(기능이름[f])}`}
                          값={내것.permissions[f]}
                          값들={['none', 'read', 'write']}
                          on={(v) => 칸바꾸기(s.prefix, f, v)}
                        />
                      </div>
                    ))}
                {/* allOff 는 운영이어도 서버가 거절한다. 칸이 숨어 있어도 이유는 보여야 한다 */}
                {경고 === 'allOff' ? (
                  <div className="hint set-perm-warn" role="status">
                    {t('세 칸이 모두 「안 씀」이면 저장되지 않습니다. 배정을 풀려면 서비스를 끄세요.')}
                  </div>
                ) : 경고 === 'noCases' && !운영 ? (
                  <div className="hint set-perm-warn" role="status">
                    {t('이대로면 실행 설정에서 고를 케이스가 보이지 않습니다.')}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="hint">{t('배정받지 않은 서비스는 그 사람의 띠에 뜨지 않습니다')}</div>
        </div>
      </div>

      {운영 ? null : (
        <div className="field">
          <span className="field-label">{t('대시보드')}</span>
          <칸고르개 이름={t('대시보드')} 값={dashboard} 값들={['none', 'read']} on={onDashboard} />
        </div>
      )}
    </>
  );
}

/** 저장해도 서버가 400 PERMISSIONS_SHAPE 로 돌려보낼 배정이 있나 */
export function 배정이틀렸나(배정들: 배정[]): boolean {
  return 배정들.some((it) => 권한경고(it.permissions) === 'allOff');
}

export function PermissionSummary({ row, services }: { row: UserRow; services: SettingsServiceRow[] }) {
  const t = use말();
  const 요약 = 계정요약(row, services);
  if (요약.운영) return <span className="set-sub">{t('운영')}</span>;
  return (
    <div className="set-sum">
      {요약.서비스.length === 0 ? <span className="set-sub">{t('배정 없음')}</span> : null}
      {요약.서비스.map((s) => (
        <div key={s.이름} className="set-sum-line">
          <span className="set-sub">{s.이름}</span>
          {s.칸들.map(([f, c]) => (
            <span key={f} className={`set-perm-chip is-${c}`}>
              {t(기능이름[f])} {t(칸이름[c])}
            </span>
          ))}
        </div>
      ))}
      <div className="set-sum-line">
        <span className={`set-perm-chip is-${요약.대시보드}`}>
          {t('대시보드')} {t(칸이름[요약.대시보드])}
        </span>
      </div>
    </div>
  );
}
