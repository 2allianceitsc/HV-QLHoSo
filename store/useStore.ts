'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ToTrinh, User, ChiPhiDong, AppNotification } from '@/types';
import { MOCK_TO_TRINH, MOCK_USERS } from '@/lib/mockData';
import { genMaToTrinh, getPhanQuyenDuyet, today } from '@/lib/utils';

interface AppState {
  currentUser: User | null;
  toTrinhs: ToTrinh[];

  login: (userId: string) => void;
  logout: () => void;

  addToTrinh: (data: Omit<ToTrinh, 'id' | 'ma' | 'createdAt'>) => string;
  updateToTrinh: (id: string, data: Partial<ToTrinh>) => void;
  deleteToTrinh: (id: string) => void;

  thamDinh: (id: string) => void;
  pheDuyet: (id: string) => void;
  tuChoi: (id: string, lyDo?: string) => void;
  guiToTrinh: (id: string) => void;
  notifications: AppNotification[];
  addNotification: (message: string, type?: AppNotification['type']) => void;
  removeNotification: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: MOCK_USERS[6], // hungnt — nhân viên IT mặc định
      toTrinhs: MOCK_TO_TRINH,
      notifications: [],

      login: (userId) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) set({ currentUser: user });
      },

      logout: () => set({ currentUser: null }),

      addToTrinh: (data) => {
        const { toTrinhs } = get();
        const ma = genMaToTrinh(data.loai, toTrinhs);
        const id = `tt-${Date.now()}`;
        const newTT: ToTrinh = {
          ...data,
          id,
          ma,
          createdAt: new Date().toISOString(),
        };
        set({ toTrinhs: [newTT, ...toTrinhs] });
        return id;
      },

      updateToTrinh: (id, data) => {
        set(state => ({
          toTrinhs: state.toTrinhs.map(tt => tt.id === id ? { ...tt, ...data } : tt),
        }));
      },

      deleteToTrinh: (id) => {
        set(state => ({ toTrinhs: state.toTrinhs.filter(tt => tt.id !== id) }));
      },

      thamDinh: (id) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const pheDuyetUser = MOCK_USERS.find(u => u.id === tt.pheDuyetId);
          get().addNotification(`📧 Email gửi đến ${pheDuyetUser?.hoTen ?? '—'} để phê duyệt tờ trình ${tt.ma}`, 'info');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'tham_dinh', thamDinhLuc: new Date().toISOString() } : t
          ),
        }));
      },

      pheDuyet: (id) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const nguoiTrinh = MOCK_USERS.find(u => u.id === tt.nguoiTrinhId);
          get().addNotification(`📧 Email thông báo tờ trình ${tt.ma} đã phê duyệt gửi đến ${nguoiTrinh?.hoTen ?? '—'}`, 'success');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'phe_duyet', pheDuyetLuc: new Date().toISOString() } : t
          ),
        }));
      },

      tuChoi: (id, lyDo) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const nguoiTrinh = MOCK_USERS.find(u => u.id === tt.nguoiTrinhId);
          get().addNotification(`📧 Email thông báo từ chối tờ trình ${tt.ma} gửi đến ${nguoiTrinh?.hoTen ?? '—'}`, 'warning');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'tu_choi', lyDoTuChoi: lyDo } : t
          ),
        }));
      },

      guiToTrinh: (id) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const thamDinhUser = MOCK_USERS.find(u => u.id === tt.thamDinhId);
          get().addNotification(`📧 Email gửi đến ${thamDinhUser?.hoTen ?? '—'} để thẩm định tờ trình ${tt.ma}`, 'info');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'cho_duyet' } : t
          ),
        }));
      },

      addNotification: (message, type = 'info') => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set(state => ({ notifications: [...state.notifications, { id, message, type }] }));
      },

      removeNotification: (id) => {
        set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
      },
    }),
    {
      name: 'hv-app-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
