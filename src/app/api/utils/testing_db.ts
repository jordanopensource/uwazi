import { setupTestUploadedPaths } from 'api/files/filesystem';
import { TranslationDBO } from 'api/i18n.v2/schemas/TranslationDBO';
import { DB } from 'api/odm';
import { models } from 'api/odm/model';
import { RelationshipDBOType } from 'api/relationships.v2/database/schemas/relationshipTypes';
import { UserInContextMockFactory } from 'api/utils/testingUserInContext';
import { Db, ObjectId } from 'mongodb';
import mongoose, { Connection } from 'mongoose';
import path from 'path';
import { EntitySchema } from 'shared/types/entityType';
import { FileType } from 'shared/types/fileType';
import { PageType } from 'shared/types/pageType';
import { Settings } from 'shared/types/settingsType';
import { IXSuggestionType } from 'shared/types/suggestionType';
import { ThesaurusSchema } from 'shared/types/thesaurusType';
import { UserGroupSchema } from 'shared/types/userGroupType';
import uniqueID from 'shared/uniqueID';
import { config } from 'api/config';
import { UserSchema } from '../../shared/types/userType';
import { elasticTesting } from './elastic_testing';
import { testingTenants } from './testingTenants';

mongoose.Promise = Promise;
let connected = false;
let mongodb: Db;

export type DBFixture = {
  files?: FileType[];
  entities?: EntitySchema[];
  dictionaries?: ThesaurusSchema[];
  usergroups?: UserGroupSchema[];
  pages?: PageType[];
  ixsuggestions?: IXSuggestionType[];
  users?: UserSchema[];
  settings?: Settings[];
  relationships?: RelationshipDBOType[];
  translationsV2?: TranslationDBO[];
  [k: string]: any;
};

const fixturer = {
  async clear(db: Db, _collections: string[] | undefined = undefined): Promise<void> {
    const collections: string[] =
      _collections || (await db.listCollections().toArray()).map(c => c.name);

    await Promise.all(
      collections.map(async c => {
        await db.collection(c).deleteMany({});
      })
    );
  },

  async clearAllAndLoad(db: Db, fixtures: DBFixture) {
    fixtures.updatelogs = fixtures.updatelogs || [];
    const existingCollections = new Set((await db.listCollections().toArray()).map(c => c.name));
    const expectedCollectons = Object.keys(models).concat(Object.keys(fixtures));
    const missingCollections = Array.from(
      new Set(expectedCollectons.filter(name => !existingCollections.has(name)))
    );
    await this.clear(db);
    await Promise.all(missingCollections.map(async collname => db.createCollection(collname)));
    await Promise.all(
      Object.keys(fixtures).map(async collectionName => {
        if (fixtures[collectionName].length) {
          await db.collection(collectionName).insertMany(fixtures[collectionName]);
        }
      })
    );
  },
};

let mongooseConnection: Connection;

const initMongoServer = async (dbName: string) => {
  const uri = config.DBHOST;
  mongooseConnection = await DB.connect(`${uri}${dbName}`);
  connected = true;
};

const testingDB: {
  mongodb: Db | null;
  dbName: string;
  UserInContextMockFactory: UserInContextMockFactory;
  connect: (options?: { defaultTenant: boolean } | undefined) => Promise<Connection>;
  disconnect: () => Promise<void>;
  tearDown: () => Promise<void>;
  id: (id?: string | undefined) => ObjectId;
  clear: (collections?: string[] | undefined) => Promise<void>;
  /**
   * @deprecated
   */
  clearAllAndLoad: (fixtures: DBFixture, elasticIndex?: string) => Promise<void>;
  createIndices: () => Promise<void>;
  setupFixturesAndContext: (
    fixtures: DBFixture,
    elasticIndex?: string,
    dbName?: string
  ) => Promise<Db | null>;
  clearAllAndLoadFixtures: (fixtures: DBFixture, dbName?: string) => Promise<void>;
} = {
  mongodb: null,
  dbName: '',
  UserInContextMockFactory: new UserInContextMockFactory(),

  async connect(options = { defaultTenant: true }) {
    if (!connected) {
      this.dbName = `uwazi_testing_${uniqueID()}_${path
        .basename(expect.getState().testPath || '')
        .replace(/[.-]/g, '_')}`.substring(0, 63);
      await initMongoServer(this.dbName);
      mongodb = mongooseConnection.db;
      this.mongodb = mongodb;

      if (options.defaultTenant) {
        testingTenants.mockCurrentTenant({
          dbName: this.dbName,
          name: this.dbName,
          indexName: 'index',
        });
        await setupTestUploadedPaths();
      }
    }

    return mongooseConnection;
  },

  async tearDown() {
    await this.disconnect();
  },

  async disconnect() {
    if (this.mongodb) {
      await this.mongodb.dropDatabase();
    }
    await mongoose.disconnect();
    testingTenants.restoreCurrentFn();
  },

  id(id = undefined) {
    return new ObjectId(id);
  },

  async clear(collections = undefined) {
    await fixturer.clear(mongodb, collections);
  },

  async setupFixturesAndContext(fixtures: DBFixture, elasticIndex?: string, dbName?: string) {
    await this.connect();
    let optionalMongo: Db | null = null;
    if (dbName) {
      optionalMongo = DB.connectionForDB(dbName).db;
    }
    await fixturer.clearAllAndLoad(optionalMongo || mongodb, fixtures);
    await this.createIndices();

    this.UserInContextMockFactory.mockEditorUser();

    if (elasticIndex) {
      testingTenants.changeCurrentTenant({ indexName: elasticIndex });
      await elasticTesting.reindex();
    }

    return optionalMongo || this.mongodb;
  },

  async createIndices() {
    const newTranslationsCollection = 'translationsV2';

    await mongodb
      .collection(newTranslationsCollection)
      .createIndex({ language: 1, key: 1, 'context.id': 1 }, { unique: true });

    await mongodb.collection(newTranslationsCollection).createIndex({ 'context.id': 1, key: 1 });
  },

  /**
   * @deprecated
   */
  async clearAllAndLoad(fixtures: DBFixture, elasticIndex?: string) {
    await this.setupFixturesAndContext(fixtures, elasticIndex);
  },

  async clearAllAndLoadFixtures(fixtures: DBFixture) {
    await fixturer.clearAllAndLoad(mongodb, fixtures);
  },
};

export { testingDB, fixturer };

// deprecated, for backward compatibility
export default testingDB;
