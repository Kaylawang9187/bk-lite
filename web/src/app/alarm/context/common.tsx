'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { UserItem } from '@/app/alarm/types/types';
import { CommonContextType, LevelItem } from '@/app/alarm/types/index';
import { useCommonApi } from '@/app/alarm/api/common';
import Spin from '@/components/spin';

const CommonContext = createContext<CommonContextType | null>(null);

const CommonContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [levelList, setLevelList] = useState<LevelItem[]>([]);
  const [levelMap, setLevelMap] = useState<Record<string, string>>({});
  const [levelListEvent, setLevelListEvent] = useState<LevelItem[]>([]);
  const [levelMapEvent, setLevelMapEvent] = useState<Record<string, string>>(
    {}
  );
  const [levelListIncident, setLevelListIncident] = useState<LevelItem[]>([]);
  const [levelMapIncident, setLevelMapIncident] = useState<
    Record<string, string>
  >({});
  const [pageLoading, setPageLoading] = useState(false);
  const { getUserList, getLevelList } = useCommonApi();

  useEffect(() => {
    const fetchAll = async () => {
      setPageLoading(true);
      try {
        const [userRes, levelRes] = await Promise.all([
          getUserList({ page_size: 10000, page: 1 }),
          getLevelList(),
        ]);
        setUserList(userRes.users);

        const byType = (type: string) => {
          const items = levelRes.filter((item) => item.level_type === type);
          const list: LevelItem[] = items.map((i) => ({
            ...i,
            label: i.level_display_name,
            value: i.level_id,
          }));
          const mp = items.reduce<Record<string, string>>((acc, cur) => {
            acc[cur.level_id] = cur.color;
            return acc;
          }, {});
          return { list, mp };
        };

        const { list: la, mp: ma } = byType('alert');
        const { list: le, mp: me } = byType('event');
        const { list: li, mp: mi } = byType('incident');

        setLevelList(la);
        setLevelMap(ma);
        setLevelListEvent(le);
        setLevelMapEvent(me);
        setLevelListIncident(li);
        setLevelMapIncident(mi);
      } finally {
        setPageLoading(false);
      }
    };
    fetchAll();
  }, []);

  return pageLoading ? (
    <Spin />
  ) : (
    <CommonContext.Provider
      value={{
        userList,
        levelList,
        levelMap,
        levelListEvent,
        levelMapEvent,
        levelListIncident,
        levelMapIncident,
      }}
    >
      {children}
    </CommonContext.Provider>
  );
};

export const useCommon = () => {
  const ctx = useContext(CommonContext);
  if (!ctx)
    throw new Error('useCommon must be used within CommonContextProvider');
  return ctx;
};

export default CommonContextProvider;
