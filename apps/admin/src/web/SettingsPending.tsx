// 설정의 승인 대기 묶음 (도메인/인증 §8.8, 게이트 1 시안 A). 계정 목록 위에 두고 수락하면 줄이 열린다

import { useState } from 'react';

import { api, ApiError, type SettingsServiceRow, type UserRow, type 배정 } from './api.js';
import { use말, use언어 } from './i18n.js';
import type { 등급 } from './role.js';
import { PermissionPicker, 배정이틀렸나 } from './SettingsPermissions.js';
import { 오류문장 } from './SettingsService.js';

// 다른 운영자가 같은 신청을 먼저 수락·거절했을 때 서버가 내는 답 (도메인/인증 §7)
const 먼저처리됨 = new Set(['ALREADY_APPROVED', 'APPROVED_USER', 'NOT_FOUND']);

export function PendingSection({
  rows,
  services,
  onDone,
}: {
  rows: UserRow[];
  services: SettingsServiceRow[];
  onDone: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 대기 = rows.filter((it) => it.isApproved === false);
  const [여는것, set여는것] = useState<{ username: string; 일: 'approve' | 'reject' } | null>(null);
  const [알림, set알림] = useState<string | null>(null);
  // 요청이 도는 동안 수락·거절을 다 잠근다. 두 번 누르면 두 번째가 「먼저 처리됨」으로 돌아와 헷갈린다
  const [보내는중, set보내는중] = useState(false);

  // 마지막 줄이 사라지면 「승인 대기 0」 머리만 남는다. 알림이 있어도 묶음째 걷는다
  if (대기.length === 0) return null;

  async function 한다(일: () => Promise<unknown>) {
    if (보내는중) return;
    set보내는중(true);
    set알림(null);
    try {
      await 일();
      set여는것(null);
      onDone();
    } catch (e) {
      if (e instanceof ApiError && 먼저처리됨.has(e.code)) {
        set여는것(null);
        set알림(t('다른 운영자가 먼저 처리했습니다'));
        onDone();
      } else {
        set알림(오류문장(e, 언어));
      }
    } finally {
      set보내는중(false);
    }
  }

  return (
    <section className="sec">
      <div className="sec-h">
        <span>{t('승인 대기 {건수}', { 건수: 대기.length })}</span>
      </div>
      {알림 === null ? null : <div className="err">{알림}</div>}

      {대기.map((it) => {
        const 열림 = 여는것?.username === it.username ? 여는것.일 : null;
        return (
          <div key={it.username}>
            <div className="set-row">
              <span className="set-name">{it.displayName}</span>
              <span className="set-sub">{it.username}</span>
              <button className="btn ghost" disabled={보내는중} onClick={() => set여는것(열림 === 'approve' ? null : { username: it.username, 일: 'approve' })}>
                {열림 === 'approve' ? t('닫기') : t('수락')}
              </button>
              <button className="btn ghost" disabled={보내는중} onClick={() => set여는것({ username: it.username, 일: 'reject' })}>
                {t('거절')}
              </button>
            </div>
            {열림 === 'reject' ? (
              // 결과를 먼저 말하고 확정은 글자가 다른 따로 된 버튼으로 둔다 — AgentToken.tsx 와 같은 모양
              <div className="set-warn">
                {t('가입 신청을 지웁니다. 되돌릴 수 없습니다')}{' '}
                <button
                  className="btn ghost set-warn"
                  disabled={보내는중}
                  onClick={() => void 한다(() => api.rejectUser(it.username))}
                >
                  {t('지운다')}
                </button>{' '}
                <button className="btn ghost" onClick={() => set여는것(null)}>
                  {t('그만두기')}
                </button>
              </div>
            ) : null}
            {열림 === 'approve' ? (
              <ApproveForm
                services={services}
                onApprove={(body) => 한다(() => api.approveUser(it.username, body))}
                onCancel={() => set여는것(null)}
              />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function ApproveForm({
  services,
  onApprove,
  onCancel,
}: {
  services: SettingsServiceRow[];
  onApprove: (body: { role: 등급; dashboard: 'none' | 'read'; services: 배정[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = use말();
  // 처음은 대시보드 읽기 · 서비스 없음. 서비스를 켜면 세 칸이 읽기로 시작한다 (§3.5 「계정이 생기는 길」)
  const [role, setRole] = useState<등급>('member');
  const [배정들, set배정들] = useState<배정[]>([]);
  const [dashboard, setDashboard] = useState<'none' | 'read'>('read');
  const [보내는중, set보내는중] = useState(false);

  return (
    <div className="set-form">
      <PermissionPicker
        services={services}
        role={role}
        onRole={setRole}
        마지막운영={false}
        배정들={배정들}
        on배정들={set배정들}
        dashboard={dashboard}
        onDashboard={setDashboard}
      />
      <div className="set-foot">
        <button className="btn ghost" disabled={보내는중} onClick={onCancel}>
          {t('그만두기')}
        </button>
        <button
          className="btn"
          disabled={보내는중 || 배정이틀렸나(배정들)}
          onClick={() => {
            set보내는중(true);
            void onApprove({ role, dashboard, services: 배정들 }).finally(() => set보내는중(false));
          }}
        >
          {t('수락한다')}
        </button>
      </div>
    </div>
  );
}
