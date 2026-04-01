'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { MOCK_USERS } from '@/lib/mockData';
import { getInitials } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();
  const [selected, setSelected] = useState('');

  const handleLogin = () => {
    if (!selected) return;
    login(selected);
    router.push('/to-trinh');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--page-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4" style={{ background: 'var(--primary)' }}>
            HV
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Xin chào!</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Chọn tài khoản để đăng nhập demo</p>
        </div>

        {/* User list */}
        <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          {MOCK_USERS.map((user, idx) => (
            <button
              key={user.id}
              onClick={() => setSelected(user.id)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
              style={{
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                background: selected === user.id ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: user.avatarColor }}
              >
                {getInitials(user.hoTen)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.hoTen}</div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.boPhan} · {user.chucVu}</div>
              </div>
              {selected === user.id && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={!selected}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: selected ? 'var(--primary)' : 'var(--border)',
            cursor: selected ? 'pointer' : 'not-allowed',
          }}
        >
          Đăng nhập
        </button>
      </div>
    </div>
  );
}
