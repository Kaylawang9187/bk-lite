'use client';

import React, { useState, useEffect } from 'react';
import OperateModal from '@/components/operate-modal';
import PermissionWrapper from '@/components/permission';
import { Form, Radio, Input, Select, message, Button } from 'antd';
import { useCommon } from '@/app/alarm/context/common';
import { useIncidentsApi } from '@/app/alarm/api/incidents';
import { useTranslation } from '@/utils/i18n';
import { IncidentTableDataItem } from '@/app/alarm/types/incidents';

interface DeclareModalProps {
  rowData: any[];
  onSuccess: (result: any) => void;
}

const DeclareModal: React.FC<DeclareModalProps> = ({ rowData, onSuccess }) => {
  const { t } = useTranslation();
  const { userList, levelListIncident } = useCommon();
  const assigneeOptions = userList.map((u) => ({
    label: `${u.display_name} (${u.username})`,
    value: u.username,
  }));

  const { getIncidentList, createIncidentDetail, modifyIncidentDetail } =
    useIncidentsApi();

  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidentOptions, setIncidentOptions] = useState<
    IncidentTableDataItem[]
  >([]);

  useEffect(() => {
    if (visible) {
      setIncidentLoading(true);
      getIncidentList({ page: -1 })
        .then((res) => {
          setIncidentOptions(res);
        })
        .finally(() => {
          setIncidentLoading(false);
        });
    } else {
      setIncidentOptions([]);
    }
  }, [visible]);

  const onFinish = async (values: any) => {
    setConfirmLoading(true);
    try {
      if (mode === 'create') {
        await createIncidentDetail({
          alert: rowData.map((r) => r.id),
          title: values.title,
          level: values.level,
          operator: values.assignee,
        });
        message.success(t('alarms.createIncident') + t('common.success'));
      } else {
        const target = incidentOptions.find(
          (inc) => inc.id === values.incidentId
        );
        const existingAlerts: number[] = target?.alert || [];
        const selectedAlerts = rowData.map((r) => r.id);
        const alert_ids = Array.from(
          new Set([...existingAlerts, ...selectedAlerts])
        );
        await modifyIncidentDetail(String(values.incidentId), {
          alert: alert_ids,
        });
        message.success(t('alarms.linkIncident') + t('common.success'));
        rowData.forEach((r) => {
          r.has_incident = true;
        });
      }
      onSuccess({ mode, ...values });
      form.resetFields();
      setVisible(false);
    } catch {
      message.error(t('common.operateFailed'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setMode('create');
    setVisible(false);
  };

  const handleDeclare = () => {
    if (rowData.some((r) => !!r.incident_name)) {
      message.error(t('alarms.declareIncidentErrorMsg'));
      return;
    }
    setVisible(true);
  };

  return (
    <>
      <PermissionWrapper requiredPermissions={['Edit']}>
        <Button
          color="danger"
          type="dashed"
          variant="solid"
          disabled={rowData.length === 0}
          onClick={handleDeclare}
        >
          {t('alarms.declareIncident')}
        </Button>
      </PermissionWrapper>
      <OperateModal
        open={visible}
        title={t('alarms.declareIncident')}
        confirmLoading={confirmLoading}
        onOk={() => form.submit()}
        onCancel={handleCancel}
      >
        <Form
          form={form}
          layout="horizontal"
          onFinish={onFinish}
          initialValues={{ mode: 'create' }}
        >
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mb-6 pl-6"
          >
            <Radio value="create">{t('alarms.createIncident')}</Radio>
            <Radio value="link">{t('alarms.linkIncident')}</Radio>
          </Radio.Group>

          {mode === 'create' ? (
            <>
              <Form.Item
                name="title"
                label={t('alarms.title')}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 20 }}
                rules={[{ required: true, message: t('common.inputMsg') }]}
              >
                <Input placeholder={t('common.inputMsg')} />
              </Form.Item>

              <Form.Item
                name="level"
                label={t('alarms.level')}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 20 }}
                rules={[{ required: true, message: t('common.selectMsg') }]}
              >
                <Radio.Group>
                  {levelListIncident.map((item) => (
                    <Radio key={item.level_id} value={String(item.level_id)}>
                      {item.level_display_name}
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="assignee"
                label={t('alarms.assignee')}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 20 }}
                rules={[{ required: true, message: t('common.selectMsg') }]}
              >
                <Select
                  allowClear
                  showSearch
                  placeholder={t('common.selectMsg')}
                  options={assigneeOptions}
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="incidentId"
              label={t('alarms.incident')}
              labelCol={{ span: 4 }}
              wrapperCol={{ span: 20 }}
              rules={[{ required: true, message: t('common.selectMsg') }]}
            >
              <Select
                allowClear
                showSearch
                placeholder={t('common.selectMsg')}
                loading={incidentLoading}
                optionLabelProp="label"
              >
                {incidentOptions.map((inc) => (
                  <Select.Option
                    key={inc.id}
                    value={inc.id}
                    label={`${inc.title}`}
                  >
                    <div className="font-medium">{inc.title}</div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </OperateModal>
    </>
  );
};

export default DeclareModal;
