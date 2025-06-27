import React from 'react';
import { Form, Input, InputNumber } from 'antd';
import { useTranslation } from '@/utils/i18n';
import {
  InstNameConfig,
  IntergrationMonitoredObject,
} from '@/app/monitor/types/monitor';
import { TableDataItem } from '@/app/monitor/types';
import { cloneDeep } from 'lodash';
import { extractBkpullUrl } from '@/app/monitor/utils/intergration';

export const useMinioBkpull = () => {
  const { t } = useTranslation();
  const pluginConfig = {
    collect_type: 'bkpull',
    config_type: ['minio'],
    collector: 'Telegraf',
    instance_type: 'minio',
    object_name: 'Minio',
  };

  return {
    getPluginCfg: (extra: {
      dataSource?: IntergrationMonitoredObject[];
      mode: 'manual' | 'auto' | 'edit';
      onTableDataChange?: (data: IntergrationMonitoredObject[]) => void;
    }) => {
      const handleFieldAndInstNameChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        config: InstNameConfig
      ) => {
        const _dataSource = cloneDeep(extra.dataSource || []);
        const fieldValue =
          _dataSource[config.index][config.dataIndex as string];
        _dataSource[config.index][config.field] = e.target.value;
        _dataSource[config.index].instance_name =
          e.target.value + `:${fieldValue || ''}`;
        extra.onTableDataChange?.(_dataSource);
      };

      const handlePortAndInstNameChange = (
        val: number,
        config: {
          index: number;
          field: string;
          dataIndex: string;
        }
      ) => {
        const _dataSource = cloneDeep(extra.dataSource || []);
        const host = _dataSource[config.index][config.dataIndex] || '';
        _dataSource[config.index][config.field] = val;
        _dataSource[config.index].instance_name = `${host}:${val || ''}`;
        extra.onTableDataChange?.(_dataSource);
      };

      const formItems = (
        <>
          <Form.Item required label={t('monitor.intergrations.host')}>
            <Form.Item
              noStyle
              name="host"
              rules={[
                {
                  required: true,
                  message: t('common.required'),
                },
              ]}
            >
              <Input
                className="w-[300px] mr-[10px]"
                disabled={extra.mode === 'edit'}
              />
            </Form.Item>
            <span className="text-[12px] text-[var(--color-text-3)]">
              {t('monitor.intergrations.commonHostDes')}
            </span>
          </Form.Item>
          <Form.Item required label={t('monitor.intergrations.port')}>
            <Form.Item
              noStyle
              name="port"
              rules={[
                {
                  required: true,
                  message: t('common.required'),
                },
              ]}
            >
              <InputNumber
                className="mr-[10px] w-[303px]"
                min={1}
                precision={0}
                disabled={extra.mode === 'edit'}
              />
            </Form.Item>
            <span className="text-[12px] text-[var(--color-text-3)]">
              {t('monitor.intergrations.commonPortDes')}
            </span>
          </Form.Item>
        </>
      );

      return {
        auto: {
          ...pluginConfig,
          formItems: null,
          initTableItems: {
            host: null,
            port: null,
          },
          defaultForm: {},
          columns: [
            {
              title: t('monitor.intergrations.host'),
              dataIndex: 'host',
              key: 'host',
              width: 200,
              render: (_: unknown, record: TableDataItem, index: number) => (
                <Input
                  value={record.host}
                  onChange={(e) =>
                    handleFieldAndInstNameChange(e, {
                      index,
                      field: 'host',
                      dataIndex: 'port',
                    })
                  }
                />
              ),
            },
            {
              title: t('monitor.intergrations.port'),
              dataIndex: 'port',
              key: 'port',
              width: 200,
              render: (_: unknown, record: TableDataItem, index: number) => (
                <InputNumber
                  value={record.port}
                  className="w-full"
                  min={1}
                  precision={0}
                  onChange={(val) =>
                    handlePortAndInstNameChange(val, {
                      index,
                      field: 'port',
                      dataIndex: 'host',
                    })
                  }
                />
              ),
            },
          ],
          getParams: (
            row: IntergrationMonitoredObject,
            config: TableDataItem
          ) => {
            const dataSource = cloneDeep(config.dataSource || []);
            return {
              configs: [
                {
                  type: pluginConfig.config_type[0],
                  ...row,
                },
              ],
              collect_type: pluginConfig.collect_type,
              collector: pluginConfig.collector,
              instances: dataSource.map((item: TableDataItem) => {
                delete item.key;
                return {
                  ...item,
                  node_ids: [item.node_ids].flat(),
                  instance_type: pluginConfig.instance_type,
                  instance_id: `${item.host}:${item.port}`,
                };
              }),
            };
          },
        },
        edit: {
          ...pluginConfig,
          formItems,
          getDefaultForm: (formData: TableDataItem) => {
            const url = formData?.child?.content?.config?.urls?.[0] || '';
            return extractBkpullUrl(url);
          },
          getParams: (
            row: IntergrationMonitoredObject,
            config: TableDataItem
          ) => {
            return config;
          },
        },
        manual: {
          defaultForm: {},
          formItems,
          getParams: (row: TableDataItem) => {
            const instanceId = `${row.host}:${row.port}`;
            return {
              instance_id: instanceId,
              instance_name: instanceId,
            };
          },
          getConfigText: () => '--',
        },
      };
    },
  };
};
