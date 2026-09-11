import apiClient from './client';

const websiteApi = {
  // GET /websites and GET /websites/:id overwrite local canvas pages after create/edit.
  getWebsites: (/* params */) => Promise.resolve({ data: { websites: [] } }),
  // getWebsites: (params) => apiClient.get('/websites', { params }),
  getWebsiteById: (/* id */) => Promise.resolve({ data: { website: null } }),
  // getWebsiteById: (id) => apiClient.get(`/websites/${id}`),
  createWebsite: (data) => apiClient.post('/websites', data),
  updateWebsite: (/* id, data */) => Promise.resolve({ data: {} }),
  // updateWebsite: (id, data) => apiClient.patch(`/websites/${id}`, data),
  getWebsitesAll: (params) => apiClient.get('/websites/all', { params }),
  deleteWebsite: (id) => apiClient.delete(`/websites/${id}`),
  restoreWebsite: (id) => apiClient.post(`/websites/${id}/restore`),
  duplicateWebsite: (id) => apiClient.post(`/websites/${id}/duplicate`),
  updateWebsiteSettings: (id, data) => apiClient.patch(`/websites/${id}/settings`, data),
  getVersions: (id) => apiClient.get(`/websites/${id}/versions`),
  publishWebsite: (id, data) => apiClient.post(`/websites/${id}/publish`, data),
  getDomains: (websiteId) => apiClient.get(`/domains/website/${websiteId}`),
  addDomain: (websiteId, domain) => apiClient.post(`/domains/website/${websiteId}/custom`, { domain }),
  addSubdomain: (websiteId, slug) => apiClient.post(`/domains/website/${websiteId}/subdomain`, { slug }),
  removeDomain: (domainId) => apiClient.delete(`/domains/${domainId}`),
  verifyDomain: (domainId) => apiClient.post(`/domains/${domainId}/verify`),
  getDeployments: (id) => apiClient.get(`/websites/${id}/deployments`),
  rollbackDeployment: (id, deploymentId) => apiClient.post(`/websites/${id}/deployments/rollback`, { deploymentId }),
  exportWebsite: (id) => apiClient.get(`/websites/${id}/export`, { responseType: 'blob' }),
};

export default websiteApi;
