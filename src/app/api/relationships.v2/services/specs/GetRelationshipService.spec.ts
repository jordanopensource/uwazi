import { MongoPermissionsDataSource } from 'api/authorization.v2/database/MongoPermissionsDataSource';
import { AuthorizationService } from 'api/authorization.v2/services/AuthorizationService';
import { getConnection } from 'api/common.v2/database/getConnectionForCurrentTenant';
import { MongoEntitiesDataSource } from 'api/entities.v2/database/MongoEntitiesDataSource';
import { MongoRelationshipsDataSource } from 'api/relationships.v2/database/MongoRelationshipsDataSource';
import { MongoRelationshipTypesDataSource } from 'api/relationshiptypes.v2/database/MongoRelationshipTypesDataSource';
import { MongoSettingsDataSource } from 'api/settings.v2/database/MongoSettingsDataSource';
import { MongoTemplatesDataSource } from 'api/templates.v2/database/MongoTemplatesDataSource';
import { User } from 'api/users.v2/model/User';
import { getFixturesFactory } from 'api/utils/fixturesFactory';
import { testingEnvironment } from 'api/utils/testingEnvironment';
import { DBFixture } from 'api/utils/testing_db';
import { DefaultTransactionManager } from 'api/common.v2/database/data_source_defaults';
import { GetRelationshipService } from '../GetRelationshipService';

const fixtureFactory = getFixturesFactory();

const fixtures: DBFixture = {
  templates: [fixtureFactory.template('template1')],
  entities: [
    fixtureFactory.entity(
      'entity1',
      'template1',
      {},
      { permissions: [{ refId: fixtureFactory.id('user'), level: 'read', type: 'user' }] }
    ),
    fixtureFactory.entity('entity2', 'template1', {}, { published: true }),
    fixtureFactory.entity('entity3', 'template1'),
  ],
  relationships: [
    fixtureFactory.v2.database.relationshipDBO('rel1', 'entity1', 'entity2', 'reltype'),
    fixtureFactory.v2.database.relationshipDBO('rel2', 'entity2', 'entity3', 'reltype'),
    fixtureFactory.v2.database.relationshipDBO('rel3', 'entity3', 'entity1', 'reltype'),
  ],
  relationtypes: [fixtureFactory.relationType('reltype')],
  settings: [
    {
      languages: [
        {
          default: true,
          label: 'English',
          key: 'en',
        },
      ],
    },
  ],
};

const createService = (_user?: User) => {
  const user = _user || new User(fixtureFactory.id('user').toString(), 'admin', []);
  const connection = getConnection();
  const transactionManager = DefaultTransactionManager();
  const relationshipsDS = new MongoRelationshipsDataSource(connection, transactionManager);
  const relationshipTypesDS = new MongoRelationshipTypesDataSource(connection, transactionManager);
  const templatesDS = new MongoTemplatesDataSource(connection, transactionManager);
  const settingsDS = new MongoSettingsDataSource(connection, transactionManager);
  const authService = new AuthorizationService(
    new MongoPermissionsDataSource(connection, transactionManager),
    user
  );
  const entitiesDS = new MongoEntitiesDataSource(
    connection,
    templatesDS,
    settingsDS,
    transactionManager
  );
  return new GetRelationshipService(
    relationshipsDS,
    authService,
    entitiesDS,
    templatesDS,
    relationshipTypesDS
  );
};

beforeEach(async () => {
  await testingEnvironment.setUp(fixtures);
});

afterAll(async () => {
  await testingEnvironment.tearDown();
});

describe('getByEntity()', () => {
  it('should return all the relationships for the entity', async () => {
    const service = createService();
    const relationshipsData = await service.getByEntity('entity2');
    expect(relationshipsData).toEqual([
      fixtureFactory.v2.application.readableRelationship(
        'rel1',
        'entity1',
        'entity1',
        'template1',
        'entity2',
        'entity2',
        'template1',
        'reltype',
        'reltype'
      ),
      fixtureFactory.v2.application.readableRelationship(
        'rel2',
        'entity2',
        'entity2',
        'template1',
        'entity3',
        'entity3',
        'template1',
        'reltype',
        'reltype'
      ),
    ]);
  });

  it('should check for user read access in the involved entities', async () => {
    const service = createService(
      new User(fixtureFactory.id('user').toString(), 'collaborator', [])
    );
    const relationshipsData = await service.getByEntity('entity2');

    expect(relationshipsData).toEqual([
      fixtureFactory.v2.application.readableRelationship(
        'rel1',
        'entity1',
        'entity1',
        'template1',
        'entity2',
        'entity2',
        'template1',
        'reltype',
        'reltype'
      ),
    ]);
  });
});
