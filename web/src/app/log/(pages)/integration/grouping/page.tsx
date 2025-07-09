'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, message, Popconfirm } from 'antd';
import useApiClient from '@/utils/request';
import useLogApi from '@/app/log/api/integration';
import { useTranslation } from '@/utils/i18n';
import {
  ColumnItem,
  ModalRef,
  Organization,
  Pagination,
  TableDataItem,
} from '@/app/log/types';
import { ReloadOutlined } from '@ant-design/icons';
import CustomTable from '@/components/custom-table';
import { useCommon } from '@/app/log/context/common';
import { showGroupName } from '@/app/log/utils/common';
import EditInstance from './editInstance';
import Permission from '@/components/permission';
import EllipsisWithTooltip from '@/components/ellipsis-with-tooltip';
import { useLocalizedTime } from '@/hooks/useLocalizedTime';
const { Search } = Input;

const Grouping = () => {
  const { isLoading } = useApiClient();
  const { getInstanceList, deleteLogInstance } = useLogApi();
  const { t } = useTranslation();
  const { convertToLocalizedTime } = useLocalizedTime();
  const commonContext = useCommon();
  const authList = useRef(commonContext?.authOrganizations || []);
  const organizationList: Organization[] = authList.current;
  const instanceRef = useRef<ModalRef>(null);
  const [pagination, setPagination] = useState<Pagination>({
    current: 1,
    total: 0,
    pageSize: 20,
  });
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableData, setTableData] = useState<TableDataItem[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const columns: ColumnItem[] = [
    {
      title: t('common.name'),
      dataIndex: 'instance_name',
      key: 'instance_name',
      width: 160,
    },
    {
      title: t('log.integration.ruleDes'),
      dataIndex: 'rule',
      key: 'rule',
      width: 200,
    },
    {
      title: t('common.belongingGroup'),
      dataIndex: 'organization',
      key: 'organization',
      width: 160,
      render: (_, { organization }) => (
        <EllipsisWithTooltip
          className="w-full overflow-hidden text-ellipsis whitespace-nowrap"
          text={showGroupName(organization, organizationList)}
        />
      ),
    },
    {
      title: t('common.createTime'),
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (val: any) => {
        return <>{convertToLocalizedTime(val, 'YYYY-MM-DD HH:mm:ss')}</>;
      },
    },
    {
      title: t('common.creator'),
      dataIndex: 'creator',
      key: 'creator',
      width: 160,
    },
    {
      title: t('common.action'),
      key: 'action',
      dataIndex: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <>
          {/* <Permission requiredPermissions={['Edit']}>
            <Button
              type="link"
              className="ml-[10px]"
              onClick={() => openInstanceModal(record, 'edit')}
            >
              {t('common.edit')}
            </Button>
          </Permission> */}
          <Button
            type="link"
            className="ml-[10px]"
            onClick={() => openInstanceModal(record, 'edit')}
          >
            {t('common.edit')}
          </Button>
          <Permission requiredPermissions={['Delete']}>
            <Popconfirm
              title={t('common.deleteTitle')}
              description={t('common.deleteContent')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              okButtonProps={{ loading: confirmLoading }}
              onConfirm={() => deleteInstConfirm(record)}
            >
              <Button type="link" className="ml-[10px]">
                {t('common.remove')}
              </Button>
            </Popconfirm>
          </Permission>
        </>
      ),
    },
  ];

  useEffect(() => {
    if (!isLoading) {
      getAssetInsts();
    }
  }, [isLoading, pagination.current, pagination.pageSize]);

  const openInstanceModal = (row = {}, type: string) => {
    instanceRef.current?.showModal({
      title: t(`common.${type}`),
      type,
      form: row,
    });
  };

  const handleTableChange = (pagination: any) => {
    setPagination(pagination);
  };

  const getAssetInsts = async (val?: string) => {
    try {
      setTableLoading(true);
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        name: val || '',
      };
      const data = await getInstanceList(params);
      setTableData(data?.results || []);
      setPagination((prev: Pagination) => ({
        ...prev,
        total: data?.count || 0,
      }));
    } finally {
      setTableLoading(false);
    }
  };

  const deleteInstConfirm = async (row: any) => {
    setConfirmLoading(true);
    try {
      const data = {
        instance_ids: [row.instance_id],
        clean_child_config: true,
      };
      await deleteLogInstance(data);
      message.success(t('common.successfullyDeleted'));
      onRefresh();
    } finally {
      setConfirmLoading(false);
    }
  };

  const onRefresh = () => {
    getAssetInsts(searchText);
  };

  const handleSearch = (val: string) => {
    setSearchText(val);
    getAssetInsts(val);
  };

  return (
    <div className="bg-[var(--color-bg-1)] h-full p-[20px]">
      <div className="flex justify-end items-center mb-[10px]">
        <Search
          allowClear
          enterButton
          className="mr-[8px] w-60"
          placeholder={t('common.searchPlaceHolder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
        ></Search>
        {/* <Permission requiredPermissions={['Add']}>
          <Button className="mr-[8px]" type="primary">
            + {t('common.add')}
          </Button>
        </Permission> */}
        <Button
          className="mr-[8px]"
          type="primary"
          onClick={() => openInstanceModal({}, 'add')}
        >
          + {t('common.add')}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} />
      </div>
      <CustomTable
        scroll={{ y: 'calc(100vh - 320px)', x: 'calc(100vh - 80px)' }}
        columns={columns}
        dataSource={tableData}
        pagination={pagination}
        loading={tableLoading}
        rowKey="instance_id"
        onChange={handleTableChange}
      ></CustomTable>
      <EditInstance ref={instanceRef} onSuccess={() => onRefresh} />
    </div>
  );
};

export default Grouping;
