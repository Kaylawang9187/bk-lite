import React, { useState, useEffect } from 'react';
import OperateModal from './operateModal';
import CustomTable from '@/components/custom-table';
import PermissionWrapper from '@/components/permission';
import { Button, Input, Card } from 'antd';
import { useTranslation } from '@/utils/i18n';
import { DatasourceItem } from '@/app/ops-analysis/types/dataSource';
import { useDashBoardApi } from '@/app/ops-analysis/api/dashBoard';

const Datasource: React.FC = () => {
  const { t } = useTranslation();
  const { getDataSources } = useDashBoardApi();
  const [searchKey, setSearchKey] = useState('');
  const [dataSourceList, setDataSourceList] = useState<DatasourceItem[]>([]);
  const [filteredList, setFilteredList] = useState<DatasourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<any>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pageSize: 20,
  });

  // 获取数据源列表
  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const response: any = await getDataSources();
      const transformedData: DatasourceItem[] = response.data.map(
        (item: any, index: number) => ({
          id: index + 1,
          name: item.label,
          describe: item.type || '数据源',
          created_time:
            new Date().toISOString().split('T')[0] +
            ' ' +
            new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
              .toTimeString()
              .split(' ')[0],
        })
      );
      setDataSourceList(transformedData);
      setFilteredList(transformedData);
      setPagination((prev) => ({ ...prev, total: transformedData.length }));
    } catch (error) {
      console.error('获取数据源列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [pagination.current, pagination.pageSize]);

  const handleFilter = (value?: string) => {
    const key = value !== undefined ? value : searchKey;
    let filtered = dataSourceList;
    if (key) {
      filtered = dataSourceList.filter((item: DatasourceItem) =>
        item.name.toLowerCase().includes(key.toLowerCase())
      );
    }
    setFilteredList(filtered);
    setPagination((prev) => ({ ...prev, total: filtered.length }));
  };

  const handleEdit = (type: 'add' | 'edit', row?: DatasourceItem) => {
    if (type === 'edit' && row) {
      setCurrentRow(row);
    } else {
      setCurrentRow(null);
    }
    setModalVisible(true);
  };

  const handleDelete = (row?: DatasourceItem) => {
    console.log('Delete row:', row);
  };

  const handleTableChange = (pg: any) => {
    setPagination((prev) => ({
      ...prev,
      current: pg.current || 1,
      pageSize: pg.pageSize || 20,
    }));
  };

  const columns = [
    { title: t('dataSource.name'), dataIndex: 'name', key: 'name', width: 150 },
    {
      title: t('dataSource.describe'),
      dataIndex: 'describe',
      key: 'describe',
      width: 120,
    },
    {
      title: t('dataSource.createdTime'),
      dataIndex: 'created_time',
      key: 'created_time',
      width: 180,
    },
    {
      title: t('common.edit'),
      key: 'operation',
      width: 100,
      render: (_: any, row: DatasourceItem) => (
        <div className="space-x-4">
          <PermissionWrapper requiredPermissions={['Edit']}>
            <Button
              type="link"
              size="small"
              onClick={() => handleEdit('edit', row)}
            >
              {t('common.edit')}
            </Button>
          </PermissionWrapper>
          <PermissionWrapper requiredPermissions={['Delete']}>
            <Button type="link" size="small" onClick={() => handleDelete(row)}>
              {t('common.delete')}
            </Button>
          </PermissionWrapper>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col w-full h-full">
      <Card
        style={{
          borderRadius: 0,
          marginBottom: '16px',
          paddingLeft: '12px',
          borderLeftWidth: '0px',
        }}
        styles={{
          body: { padding: '16px' },
        }}
      >
        <p className="font-extrabold text-base mb-2">
          {t('dataSource.introTitle')}
        </p>
        <p className="text-sm text-gray-600">{t('dataSource.introMsg')}</p>
      </Card>
      <div className="px-6 pb-0">
        <div className="flex justify-between mb-[20px]">
          <div className="flex items-center">
            <Input
              allowClear
              value={searchKey}
              placeholder={t('common.searchPlaceHolder')}
              style={{ width: 250 }}
              onChange={(e) => setSearchKey(e.target.value)}
              onPressEnter={(e) => handleFilter(e.currentTarget.value)}
              onClear={() => {
                setSearchKey('');
                handleFilter('');
              }}
            />
          </div>
          <PermissionWrapper requiredPermissions={['Add']}>
            <Button type="primary" onClick={() => handleEdit('add')}>
              {t('common.addNew')}
            </Button>
          </PermissionWrapper>
        </div>
        <CustomTable
          size="middle"
          rowKey="id"
          columns={columns}
          loading={loading}
          dataSource={filteredList.slice(
            (pagination.current - 1) * pagination.pageSize,
            pagination.current * pagination.pageSize
          )}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ y: 'calc(100vh - 360px)' }}
        />
        <OperateModal
          open={modalVisible}
          currentRow={currentRow}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            setModalVisible(false);
            fetchDataSources(); // 重新获取数据
          }}
        />
      </div>
    </div>
  );
};

export default Datasource;
