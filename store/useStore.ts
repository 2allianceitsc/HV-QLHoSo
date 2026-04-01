'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ToTrinh, User, ChiPhiDong } from '@/types';
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
  tuChoi: (id: string) => void;
  guiToTrinh: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: MOCK_USERS[6], // hungnt — nhân viên IT mặc định
      toTrinhs: MOCK_TO_TRINH,

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
        set(state => ({
          toTrinhs: state.toTrinhs.map(tt =>
            tt.id === id ? { ...tt, trangThai: 'tham_dinh', thamDinhLuc: new Date().toISOString() } : tt
          ),
        }));
      },

      pheDuyet: (id) => {
        set(state => ({
          toTrinhs: state.toTrinhs.map(tt =>
            tt.id === id ? { ...tt, trangThai: 'phe_duyet', pheDuyetLuc: new Date().toISOString() } : tt
          ),
        }));
      },

      tuChoi: (id) => {
        set(state => ({
          toTrinhs: state.toTrinhs.map(tt =>
            tt.id === id ? { ...tt, trangThai: 'tu_choi' } : tt
          ),
        }));
      },

      guiToTrinh: (id) => {
        set(state => ({
          toTrinhs: state.toTrinhs.map(tt =>
            tt.id === id ? { ...tt, trangThai: 'cho_duyet' } : tt
          ),
        }));
      },
    }),
    {
      name: 'hv-app-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
