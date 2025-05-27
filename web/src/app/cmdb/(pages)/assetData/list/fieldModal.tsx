'use client';

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import {
  Input,
  InputNumber,
  Button,
  Form,
  message,
  Select,
  Cascader,
  DatePicker,
  Col,
  Row,
  Checkbox,
} from 'antd';
import OperateModal from '@/components/operate-modal';
import { useTranslation } from '@/utils/i18n';
import {
  AttrFieldType,
  Organization,
  UserItem,
} from '@/app/cmdb/types/assetManage';
import { deepClone } from '@/app/cmdb/utils/common';
import useApiClient from '@/utils/request';
import dayjs from 'dayjs';
import EllipsisWithTooltip from '@/components/ellipsis-with-tooltip';

interface FieldModalProps {
  onSuccess: (instId?: string) => void;
  organizationList: Organization[];
  userList: UserItem[];
}

interface FieldConfig {
  type: string;
  attrList: AttrFieldType[];
  formInfo: any;
  subTitle: string;
  title: string;
  model_id: string;
  list: Array<any>;
}

interface RequestParams {
  model_id?: string;
  instance_info?: object;
  inst_ids?: number[];
  update_data?: object;
}

export interface FieldModalRef {
  showModal: (info: FieldConfig) => void;
}

const FieldMoadal = forwardRef<FieldModalRef, FieldModalProps>(
  ({ onSuccess, userList, organizationList }, ref) => {
    const [groupVisible, setGroupVisible] = useState<boolean>(false);
    const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
    const [subTitle, setSubTitle] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [type, setType] = useState<string>('');
    const [formItems, setFormItems] = useState<AttrFieldType[]>([]);
    const [instanceData, setInstanceData] = useState<any>({});
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [modelId, setModelId] = useState<string>('');
    const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>(
      {}
    );
    const [proxyOptions, setProxyOptions] = useState<
      { proxy_id: string; proxy_name: string }[]
    >([]);
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const { get, post } = useApiClient();

    useEffect(() => {
      if (groupVisible) {
        setEnabledFields({});
        form.resetFields();
        form.setFieldsValue(instanceData);
      }
    }, [groupVisible, instanceData]);

    useEffect(() => {
      if (groupVisible && modelId === 'host') {
        get('/cmdb/api/instance/list_proxys/', {})
          .then((data: any[]) => {
            setProxyOptions(data || []);
          })
          .catch(() => {
            setProxyOptions([]);
          });
      }
    }, [groupVisible, modelId]);

    // 监听 ip_addr 和 cloud，自动填充 inst_name
    const ipValue = Form.useWatch('ip_addr', form);
    const cloudValue = Form.useWatch('cloud', form);
    useEffect(() => {
      if (modelId === 'host') {
        const cloudName = proxyOptions.find(
          (opt) => opt.proxy_id === cloudValue
        )?.proxy_name;
        if (ipValue && cloudName) {
          form.setFieldsValue({
            inst_name: `${ipValue || ''}[${cloudName || ''}]`,
          });
        }
      }
    }, [ipValue, cloudValue, modelId, proxyOptions]);

    useImperativeHandle(ref, () => ({
      showModal: ({
        type,
        attrList,
        subTitle,
        title,
        formInfo,
        model_id,
        list,
      }) => {
        // 开启弹窗的交互
        setGroupVisible(true);
        setSubTitle(subTitle);
        setType(type);
        setTitle(title);
        setModelId(model_id);
        setFormItems(attrList);
        setSelectedRows(list);
        const forms = deepClone(formInfo);
        if (type === 'add') {
          Object.assign(forms, {
            organization: organizationList[0]?.value
              ? [organizationList[0]?.value]
              : '',
          });
        } else {
          for (const key in forms) {
            const target = attrList.find((item) => item.attr_id === key);
            if (target?.attr_type === 'time' && forms[key]) {
              forms[key] = dayjs(forms[key], 'YYYY-MM-DD HH:mm:ss');
            }
          }
        }
        setInstanceData(forms);
      },
    }));

    const handleFieldToggle = (fieldId: string, enabled: boolean) => {
      setEnabledFields((prev) => ({
        ...prev,
        [fieldId]: enabled,
      }));

      if (!enabled) {
        form.setFieldValue(fieldId, undefined);
      }
    };

    const renderFormLabel = (item: AttrFieldType) => {
      return (
        <div className="flex items-center">
          {type === 'batchEdit' && item.editable && !item.is_only ? (
            <Checkbox
              checked={enabledFields[item.attr_id]}
              onChange={(e) =>
                handleFieldToggle(item.attr_id, e.target.checked)
              }
            >
              <span>{item.attr_name}</span>
            </Checkbox>
          ) : (
            <span className="ml-2">{item.attr_name}</span>
          )}
          {item.is_required && type !== 'batchEdit' && (
            <span className="text-[#ff4d4f] ml-1">*</span>
          )}
        </div>
      );
    };

    const renderFormField = (item: AttrFieldType) => {
      const fieldDisabled =
        type === 'batchEdit'
          ? !enabledFields[item.attr_id]
          : !item.editable && type !== 'add';

      const hostDisabled = modelId === 'host' && item.attr_id === 'inst_name';

      const formField = (() => {
        // 特殊处理-主机的云区域为下拉选项
        if (item.attr_id === 'cloud') {
          return (
            <Select
              disabled={fieldDisabled}
              placeholder={t('common.selectMsg')}
            >
              {proxyOptions.map((opt) => (
                <Select.Option key={opt.proxy_id} value={opt.proxy_id}>
                  {opt.proxy_name}
                </Select.Option>
              ))}
            </Select>
          );
        }
        switch (item.attr_type) {
          case 'user':
            return (
              <Select
                showSearch
                disabled={fieldDisabled}
                placeholder={t('common.selectMsg')}
              >
                {userList.map((opt: UserItem) => (
                  <Select.Option key={opt.id} value={opt.id}>
                    <EllipsisWithTooltip text={`${opt.display_name} (${opt.username})`} className="whitespace-nowrap overflow-hidden text-ellipsis break-all" />
                  </Select.Option>
                ))}
              </Select>
            );
          case 'enum':
            return (
              <Select
                disabled={fieldDisabled}
                placeholder={t('common.selectMsg')}
              >
                {item.option?.map((opt) => (
                  <Select.Option key={opt.id} value={opt.id}>
                    {opt.name}
                  </Select.Option>
                ))}
              </Select>
            );
          case 'bool':
            return (
              <Select
                disabled={fieldDisabled}
                placeholder={t('common.selectMsg')}
              >
                {[
                  { id: 1, name: 'Yes' },
                  { id: 0, name: 'No' },
                ].map((opt) => (
                  <Select.Option key={opt.id} value={opt.id}>
                    {opt.name}
                  </Select.Option>
                ))}
              </Select>
            );
          case 'time':
            return (
              <DatePicker
                showTime
                disabled={fieldDisabled}
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: '100%' }}
              />
            );
          case 'organization':
            return (
              <Cascader
                showSearch
                disabled={fieldDisabled}
                options={organizationList}
              />
            );
          case 'int':
            return (
              <InputNumber
                disabled={fieldDisabled}
                style={{ width: '100%' }}
                placeholder={t('common.inputMsg')}
              />
            );
          default:
            return (
              <Input
                placeholder={t('common.inputMsg')}
                disabled={fieldDisabled || hostDisabled}
              />
            );
        }
      })();

      return formField;
    };

    const handleSubmit = (confirmType?: string) => {
      form.validateFields().then((values) => {
        for (const key in values) {
          const target = formItems.find((item) => item.attr_id === key);
          if (target?.attr_type === 'time' && values[key]) {
            values[key] = values[key].format('YYYY-MM-DD HH:mm:ss');
          }
        }
        operateAttr(values, confirmType);
      });
    };

    const operateAttr = async (params: AttrFieldType, confirmType?: string) => {
      try {
        if (type === 'batchEdit') {
          const hasEnabledFields = Object.values(enabledFields).some(
            (enabled) => enabled
          );
          if (!hasEnabledFields) {
            message.warning(t('common.inputMsg'));
            return;
          }
        }
        setConfirmLoading(true);
        const formData =
          type === 'batchEdit'
            ? Object.keys(params).reduce((acc, key) => {
              if (enabledFields[key]) {
                acc[key] = params[key];
              }
              return acc;
            }, {} as any)
            : params;
        const msg: string = t(
          type === 'add' ? 'successfullyAdded' : 'successfullyModified'
        );
        const url: string =
          type === 'add'
            ? `/cmdb/api/instance/`
            : `/cmdb/api/instance/batch_update/`;
        let requestParams: RequestParams = {
          model_id: modelId,
          instance_info: formData,
        };
        if (type !== 'add') {
          if (type === 'batchEdit') {
            for (const key in formData) {
              if (
                !formData[key] &&
                formData[key] !== 0 &&
                formData[key] !== false
              ) {
                delete formData[key];
              }
            }
          }
          requestParams = {
            inst_ids: type === 'edit' ? [instanceData._id] : selectedRows,
            update_data: formData,
          };
        }
        const { _id: instId } = await post(url, requestParams);
        message.success(msg);
        onSuccess(confirmType ? instId : '');
        handleCancel();
      } catch (error) {
        console.log(error);
      } finally {
        setConfirmLoading(false);
      }
    };

    const handleCancel = () => {
      setGroupVisible(false);
    };

    return (
      <div>
        <OperateModal
          title={title}
          subTitle={subTitle}
          open={groupVisible}
          width={730}
          onCancel={handleCancel}
          footer={
            <div>
              <Button
                className="mr-[10px]"
                type="primary"
                loading={confirmLoading}
                onClick={() => handleSubmit()}
              >
                {t('confirm')}
              </Button>
              <Button
                className="mr-[10px]"
                loading={confirmLoading}
                onClick={() => handleSubmit('associate')}
              >
                {t('Model.confirmAndAssociate')}
              </Button>
              <Button onClick={handleCancel}>{t('cancel')}</Button>
            </div>
          }
        >
          <Form form={form} layout="vertical">
            <div className="font-[600] text-[var(--color-text-2)] text-[18px] pl-[12px] pb-[14px]">
              {t('group')}
            </div>
            <Row gutter={24}>
              {formItems
                .filter((formItem) => formItem.attr_id === 'organization')
                .map((item) => (
                  <Col span={12} key={item.attr_id}>
                    <Form.Item
                      className="mb-4"
                      name={item.attr_id}
                      label={renderFormLabel({
                        ...item,
                        attr_type: 'organization',
                      })}
                      rules={[
                        {
                          required: item.is_required && type !== 'batchEdit',
                          message: t('required'),
                        },
                      ]}
                    >
                      {renderFormField({
                        ...item,
                        attr_type: 'organization',
                      })}
                    </Form.Item>
                  </Col>
                ))}
            </Row>
            <div className="font-[600] text-[var(--color-text-2)] text-[18px] pl-[12px] pb-[14px]">
              {t('information')}
            </div>
            <Row gutter={24}>
              {formItems
                .filter((formItem) => formItem.attr_id !== 'organization')
                .map((item) => (
                  <Col span={12} key={item.attr_id}>
                    <Form.Item
                      className="mb-4"
                      name={item.attr_id}
                      label={renderFormLabel(item)}
                      rules={[
                        {
                          required: item.is_required && type !== 'batchEdit',
                          message: t('required'),
                        },
                      ]}
                    >
                      {renderFormField(item)}
                    </Form.Item>
                  </Col>
                ))}
            </Row>
          </Form>
        </OperateModal>
      </div>
    );
  }
);
FieldMoadal.displayName = 'fieldMoadal';
export default FieldMoadal;
