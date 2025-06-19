import useApiClient from '@/utils/request';

export const useIncidentsApi = () => {
  const { get, post, patch } = useApiClient();

  const getIncidentList = async (params: any) => {
    return get('/alerts/api/incident/', { params });
  };

  const getIncidentDetail = async (id: string) => {
    return get(`/alerts/api/incident/${id}/`);
  };

  const createIncidentDetail = async (params: any) => {
    return post(`/alerts/api/incident/`, params);
  };

  const modifyIncidentDetail = async (id: string, params: any) => {
    return patch(`/alerts/api/incident/${id}/`, params);
  };

  return {
    getIncidentList,
    getIncidentDetail,
    createIncidentDetail,
    modifyIncidentDetail,
  };
};
