'use client';

import React, { useRef } from 'react';
import CustomTable from '@/components/custom-table';
import AlarmAction from '../../(pages)/alarms/components/alarmAction';
import AlertDetail from '../../(pages)/alarms/components/alarmDetail';
import Icon from '@/components/icon';
import UserAvatar from '@/app/alarm/components/userAvatar';
import type { ColumnsType } from 'antd/es/table';
import { Tag, Button } from 'antd';
import { AlarmTableProps } from '@/app/alarm/types/alarms';
import { TableDataItem } from '@/app/alarm/types/types';
import { useTranslation } from '@/utils/i18n';
import { useLocalizedTime } from '@/hooks/useLocalizedTime';
import { ModalRef } from '@/app/alarm/types/types';
import { useStateMap, useNotifiedStateMap } from '@/app/alarm/constants/alarm';
import { useCommon } from '@/app/alarm/context/common';

const AlarmTable: React.FC<AlarmTableProps> = ({
  dataSource,
  pagination,
  loading,
  tableScrollY,
  selectedRowKeys,
  onChange,
  onRefresh,
  onSelectionChange,
  extraActions,
}) => {
  const { t } = useTranslation();
  const { convertToLocalizedTime } = useLocalizedTime();
  const { levelList, levelMap } = useCommon();
  const STATE_MAP = useStateMap();
  const NOTIFIED_STATE: any = useNotifiedStateMap();
  const detailRef = useRef<ModalRef>(null);

  const columns: ColumnsType<TableDataItem> = [
    {
      title: t('alarms.level'),
      dataIndex: 'level',
      key: 'level',
      width: 110,
      fixed: 'left',
      render: (_: any, { level }: TableDataItem) => {
        const target = levelList.find(
          (item) => item.level_id === Number(level)
        );
        return (
          <Tag color={levelMap[level || '']}>
            <div className="flex items-center">
              <Icon type={target?.icon || ''} className="mr-1" />
              {target?.level_display_name || '--'}
            </div>
          </Tag>
        );
      },
    },
    {
      title: t('alarms.firstEventTime'),
      dataIndex: 'first_event_time',
      key: 'first_event_time',
      width: 190,
      render: (_: any, { first_event_time }: TableDataItem) =>
        first_event_time ? convertToLocalizedTime(first_event_time) : '--',
    },
    {
      title: t('alarms.lastEventTime'),
      dataIndex: 'last_event_time',
      key: 'last_event_time',
      width: 190,
      render: (_: any, { last_event_time }: TableDataItem) =>
        last_event_time ? convertToLocalizedTime(last_event_time) : '--',
    },
    {
      title: t('alarms.eventTitle'),
      dataIndex: 'title',
      key: 'title',
      width: 290,
    },
    {
      title: t('alarms.eventCount'),
      dataIndex: 'event_count',
      key: 'event_count',
      width: 110,
      render: (_: any, record: TableDataItem) => (
        <Button type="link" onClick={() => onOpenDetail(record, 'event')}>
          <span className="text-blue-500">{record.event_count}</span>
        </Button>
      ),
    },
    {
      title: t('alarms.source'),
      dataIndex: 'source_names',
      key: 'source_names',
      width: 130,
    },
    {
      title: t('alarms.state'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: any, { status }: TableDataItem) => (
        <span>{STATE_MAP[status as keyof typeof STATE_MAP] || '--'}</span>
      ),
    },
    {
      title: t('alarms.duration'),
      dataIndex: 'duration',
      key: 'duration',
      width: 170,
    },
    {
      title: t('common.operator'),
      dataIndex: 'operator_user',
      key: 'operator_user',
      width: 200,
      render: (_: any, { operator_user }: TableDataItem) =>
        operator_user ? <UserAvatar userName={operator_user} /> : '--',
    },
    {
      title: t('alarms.notificationStatus'),
      dataIndex: 'notification_status',
      key: 'notification_status',
      width: 150,
      render: (_: any, { notification_status }: TableDataItem) => {
        return notification_status ? (
          <Tag color={notification_status === 'success' ? 'green' : 'red'}>
            {NOTIFIED_STATE[notification_status] || '--'}
          </Tag>
        ) : (
          '--'
        );
      },
    },
    {
      title: t('common.action'),
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_: any, record: TableDataItem) => (
        <div className="flex items-center">
          <Button
            className="mr-[12px]"
            type="link"
            onClick={() => onOpenDetail(record)}
          >
            {t('common.detail')}
          </Button>
          {extraActions && extraActions(record)}
          <AlarmAction rowData={[record]} onAction={onRefresh} />
        </div>
      ),
    },
  ];

  const onOpenDetail = (
    row: TableDataItem,
    defaultTab: string = 'baseInfo'
  ) => {
    detailRef.current?.showModal({
      title: row.title,
      form: row,
      type: '',
      defaultTab,
    });
  };

  return (
    <>
      <CustomTable
        scroll={{ y: tableScrollY, x: 'calc(100vw - 320px)' }}
        columns={columns}
        dataSource={dataSource}
        pagination={pagination}
        loading={loading}
        rowKey="id"
        onChange={onChange}
        rowSelection={{ selectedRowKeys, onChange: onSelectionChange }}
      />
      <AlertDetail ref={detailRef} handleAction={onRefresh} />
    </>
  );
};

export default AlarmTable;
