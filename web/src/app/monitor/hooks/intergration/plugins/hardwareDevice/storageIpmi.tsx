import React from 'react';
import { Form, Input } from 'antd';
import { useTranslation } from '@/utils/i18n';
import {
  InstNameConfig,
  IntergrationMonitoredObject,
} from '@/app/monitor/types/monitor';
import { TableDataItem } from '@/app/monitor/types';
import { useIpmiCommonFormItems } from '../../common/ipmiCommonFormItems';
import { cloneDeep } from 'lodash';
import {
  extractIPMIUrl,
  replaceTemplate,
} from '@/app/monitor/utils/intergration';

export const useStorageIpmiPlugin = () => {
  const { t } = useTranslation();
  const ipmiCommonFormItems = useIpmiCommonFormItems();
  const pluginConfig = {
    collect_type: 'ipmi',
    config_type: ['storage'],
    collector: 'Telegraf',
    instance_type: 'storage',
    object_name: 'Storage',
  };

  return {
    getPluginCfg: (extra: {
      dataSource?: IntergrationMonitoredObject[];
      mode: 'manual' | 'auto' | 'edit';
      onTableDataChange?: (data: IntergrationMonitoredObject[]) => void;
    }) => {
      const isEdit = extra.mode === 'edit';
      const disabledForm = {
        username: true,
        password: true,
        protocol: true,
      };

      const handleFieldAndInstNameChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        config: InstNameConfig
      ) => {
        const _dataSource = cloneDeep(extra.dataSource || []);
        _dataSource[config.index][config.field] = _dataSource[
          config.index
        ].instance_name = e.target.value;
        extra.onTableDataChange?.(_dataSource);
      };

      const formItems = (
        <>
          <Form.Item required label="IP">
            <Form.Item
              noStyle
              name="monitor_ip"
              rules={[
                {
                  required: true,
                  message: t('common.required'),
                },
              ]}
            >
              <Input className="w-[300px] mr-[10px]" disabled={isEdit} />
            </Form.Item>
            <span className="text-[12px] text-[var(--color-text-3)]">
              {t('monitor.intergrations.ipDes')}
            </span>
          </Form.Item>
          {ipmiCommonFormItems.getCommonFormItems(disabledForm)}
        </>
      );

      return {
        auto: {
          ...pluginConfig,
          formItems: ipmiCommonFormItems.getCommonFormItems(),
          initTableItems: {
            ip: null,
          },
          defaultForm: {
            protocol: 'lanplus',
          },
          columns: [
            {
              title: 'IP',
              dataIndex: 'ip',
              key: 'ip',
              width: 200,
              render: (
                value: string,
                record: IntergrationMonitoredObject,
                index: number
              ) => (
                <Input
                  value={record.ip as string}
                  onChange={(e) =>
                    handleFieldAndInstNameChange(e, {
                      index,
                      field: 'ip',
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
                const target: TableDataItem | undefined = config.nodeList.find(
                  (tex: IntergrationMonitoredObject) => item.node_ids === tex.id
                );
                return {
                  ...item,
                  node_ids: [item.node_ids].flat(),
                  instance_type: pluginConfig.instance_type,
                  instance_id:
                    pluginConfig.object_name + '-' + (target?.ip || ''),
                };
              }),
            };
          },
        },
        edit: {
          ...pluginConfig,
          formItems,
          getDefaultForm: (formData: TableDataItem) => {
            const url = formData?.child?.content?.config?.servers?.[0] || '';
            return extractIPMIUrl(url);
          },
          getParams: (formData: TableDataItem, configForm: TableDataItem) =>
            configForm,
        },
        manual: {
          defaultForm: {
            protocol: 'lanplus',
          },
          formItems,
          getParams: (row: TableDataItem) => {
            const instanceId =
              pluginConfig.object_name + '-' + (row?.monitor_ip || '');
            return {
              instance_id: instanceId,
              instance_name: instanceId,
            };
          },
          getConfigText: (formData: { [key: string]: string | number }) => {
            const instanceId =
              pluginConfig.object_name + '-' + (formData?.monitor_ip || '');
            const configText = `[[inputs.ipmi_sensor]]
    servers = ["$username:$password@lanplus($monitor_ip)"]
    interval = "$intervals"
    tags = { "instance_id"="$instance_id", "instance_type"="$instance_type", "collect_type"="$collect_type" }`;
            return replaceTemplate(configText, {
              ...formData,
              instance_id: instanceId,
              instance_type: pluginConfig.instance_type,
              collect_type: pluginConfig.collect_type,
              config_type: pluginConfig.config_type[0] || '',
            });
          },
        },
      };
    },
  };
};
