import api from 'app/utils/api';
import { RequestParams } from 'app/utils/RequestParams';

export default {
  get(requestParams = new RequestParams()) {
    return api.get('v2/relationships', requestParams).then(response => response.json);
  },

  post(requestParams = new RequestParams()) {
    return api.post('v2/relationships', requestParams).then(response => response.json);
  },

  delete(requestParams = new RequestParams()) {
    return api.delete('v2/relationships', requestParams).then(response => response.json);
  },

  migrate(requestParams = new RequestParams()) {
    return api.post('v2/relationships/migrate', requestParams).then(response => response.json);
  },

  testOneHub(requestParams = new RequestParams()) {
    return api.post('v2/relationships/test_one_hub', requestParams).then(response => response.json);
  },

  createRelationshipMigrationField(requestParams = new RequestParams()) {
    return api.put('v2/relationshipMigrationFields', requestParams).then(response => response.json);
  },

  updateRelationshipMigrationField(requestParams = new RequestParams()) {
    return api
      .post('v2/relationshipMigrationFields', requestParams)
      .then(response => response.json);
  },

  deleteRelationshipMigrationField(requestParams = new RequestParams()) {
    return api.delete('v2/relationshipMigrationFields', requestParams);
  },

  getCurrentPlan() {
    return api.get('v2/relationshipMigrationFields').then(response => response.json);
  },

  getHubrecordPage(requestParams = new RequestParams()) {
    return api.get('v2/migrationHubRecords', requestParams).then(response => response.json);
  },
};
