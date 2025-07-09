import useApiClient from '@/utils/request';
import React from 'react';
import {
  InstanceInfo,
  IntegrationLogInstance,
} from '@/app/log/types/integration';
interface NodeConfigParam {
  configs?: any;
  collect_type?: string;
  collector?: string;
  instances?: Omit<IntegrationLogInstance, 'key'>[];
}

const useIntegrationApi = () => {
  const { get, post } = useApiClient();

  const getCollectTypes = async (
    params: {
      collector?: React.Key | null;
      name?: string;
      page?: number;
      page_size?: number;
    } = {}
  ) => {
    return await get('/log/collect_types/', {
      params,
    });
  };

  const batchCreateInstances = async (data: NodeConfigParam) => {
    return await post('/log/collect_instances/batch_create/', data);
  };

  const getLogNodeList = async (data: {
    cloud_region_id?: number;
    page?: number;
    page_size?: number;
    is_active?: boolean;
  }) => {
    return await post('/log/node_mgmt/nodes/', data);
  };

  const getInstanceList = async (data: {
    collect_type_id?: number;
    page?: number;
    page_size?: number;
    name?: string;
  }) => {
    return await post('/log/collect_instances/search/', data);
  };

  const getInstanceChildConfig = async (data: {
    instance_id?: string | number;
    instance_type?: string;
  }) => {
    return await post(`/log/api/node_mgmt/get_instance_asso_config/`, data);
  };

  const deleteLogInstance = async (data: {
    instance_ids: any;
    clean_child_config: boolean;
  }) => {
    return await post(
      `/log/collect_instances/remove_collect_instance/`,
      data
    );
  };

  const updateMonitorInstance = async (data: InstanceInfo) => {
    return await post(
      '/log/api/monitor_instance/update_monitor_instance/',
      data
    );
  };

  const setInstancesGroup = async (data: {
    instance_ids: React.Key[];
    organizations: React.Key[];
  }) => {
    return await post(
      `/log/collect_configs/set_organizations/`,
      data
    );
  };

  const getConfigContent = async (params: { id: React.Key }) => {
    return await get('/log/collect_configs/get_config_content/', {
      params,
    });
  };

  const updateInstanceCollectConfig = async (data: {
    id: React.Key;
    content: any;
  }) => {
    return await post(
      `/log/collect_configs/update_instance_collect_config/`,
      data
    );
  };

  return {
    getCollectTypes,
    getLogNodeList,
    batchCreateInstances,
    getInstanceList,
    getInstanceChildConfig,
    deleteLogInstance,
    updateMonitorInstance,
    setInstancesGroup,
    getConfigContent,
    updateInstanceCollectConfig,
  };
};

export default useIntegrationApi;
