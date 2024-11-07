import { ResultSet } from 'api/common.v2/contracts/ResultSet';
import { MongoDataSource } from 'api/common.v2/database/MongoDataSource';
import { MongoIdHandler } from 'api/common.v2/database/MongoIdGenerator';
import { MongoResultSet } from 'api/common.v2/database/MongoResultSet';
import { MongoTransactionManager } from 'api/common.v2/database/MongoTransactionManager';
import entities from 'api/entities/entities';
import { MongoSettingsDataSource } from 'api/settings.v2/database/MongoSettingsDataSource';
import { MongoTemplatesDataSource } from 'api/templates.v2/database/MongoTemplatesDataSource';
import { Db } from 'mongodb';
import { MetadataSchema } from 'shared/types/commonTypes';
import { EntitiesDataSource } from '../contracts/EntitiesDataSource';
import { Entity, EntityMetadata, MetadataValue } from '../model/Entity';
import { EntityMappers } from './EntityMapper';
import { EntityDBO, EntityJoinTemplate } from './schemas/EntityTypes';

export class MongoEntitiesDataSource
  extends MongoDataSource<EntityDBO>
  implements EntitiesDataSource
{
  protected collectionName = 'entities';

  private settingsDS: MongoSettingsDataSource;

  protected templatesDS: MongoTemplatesDataSource;

  constructor(
    db: Db,
    templatesDS: MongoTemplatesDataSource,
    settingsDS: MongoSettingsDataSource,
    transactionManager: MongoTransactionManager
  ) {
    super(db, transactionManager);
    this.templatesDS = templatesDS;
    this.settingsDS = settingsDS;
  }

  // eslint-disable-next-line class-methods-use-this
  async updateEntity(entity: Entity) {
    // This is using V1 so that it gets denormalized to speed up development
    // this is a hack and should be changed as soon as we finish AT
    const entityToModify = await entities.getById(entity._id);
    if (!entityToModify) {
      throw new Error(`entity does not exists: ${entity._id}`);
    }

    entityToModify.title = entity.title;
    entityToModify.metadata = entity.metadata as MetadataSchema;
    await entities.save(entityToModify, { user: {}, language: entityToModify.language });
  }

  async entitiesExist(sharedIds: string[]) {
    const languages = await this.settingsDS.getLanguageKeys();
    const countInExistence = await this.getCollection().countDocuments({
      sharedId: { $in: sharedIds },
    });
    return countInExistence === sharedIds.length * languages.length;
  }

  async markMetadataAsChanged(
    propData: Parameters<EntitiesDataSource['markMetadataAsChanged']>[0]
  ) {
    const stream = this.createBulkStream();
    for (let i = 0; i < propData.length; i += 1) {
      const data = propData[i];

      const filter =
        'template' in data
          ? { template: MongoIdHandler.mapToDb(data.template) }
          : { sharedId: data.sharedId };
      const update = 'properties' in data ? { $each: data.properties } : data.property;

      // eslint-disable-next-line no-await-in-loop
      await stream.updateMany(filter, { $addToSet: { obsoleteMetadata: update } });
    }
    await stream.flush();
  }

  getByIds(sharedIds: string[], language?: string) {
    const match: { sharedId: { $in: string[] }; language?: string } = {
      sharedId: { $in: sharedIds },
    };
    if (language) match.language = language;
    const cursor = this.getCollection().aggregate<EntityJoinTemplate>([
      { $match: match },
      {
        $lookup: {
          from: 'templates',
          localField: 'template',
          foreignField: '_id',
          as: 'joinedTemplate',
        },
      },
    ]);

    return new MongoResultSet(cursor, async entity => EntityMappers.toModel(entity));
  }

  getIdsByTemplate(templateId: string): ResultSet<string> {
    const cursor = this.getCollection().find({ template: MongoIdHandler.mapToDb(templateId) });
    return new MongoResultSet(cursor, async entity => entity.sharedId);
  }

  async updateDenormalizedMetadataValues(
    sharedId: string,
    language: string,
    title: string,
    propertiesToNewValues: { propertyName: string; value?: any }[]
  ) {
    const stream = this.createBulkStream();

    await Promise.all(
      propertiesToNewValues.map(async ({ propertyName, value }) => {
        await stream.updateMany(
          { [`metadata.${propertyName}.value`]: sharedId, language },
          // @ts-ignore
          {
            $set: {
              [`metadata.${propertyName}.$[valueIndex].label`]: title,
              ...(value
                ? { [`metadata.${propertyName}.$[valueIndex].inheritedValue`]: value }
                : {}),
            },
          },
          {
            arrayFilters: [{ 'valueIndex.value': sharedId }],
          }
        );
      })
    );

    return stream.flush();
  }

  getByDenormalizedId(properties: string[], sharedIds: string[]): ResultSet<string> {
    const result = this.getCollection().find({
      $or: properties.map(property => ({ [`metadata.${property}.value`]: { $in: sharedIds } })),
    });

    return new MongoResultSet(result, entity => entity.sharedId);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateMetadataValues(
    id: Entity['_id'],
    values: Record<string, { value: MetadataValue }[]>,
    title?: string
  ) {
    // This is using V1 so that it gets denormalized to speed up development
    // this is a hack and should be changed as soon as we finish AT
    const entityToModify = await entities.getById(id);
    if (!entityToModify) {
      throw new Error(`entity does not exists: ${id}`);
    }

    entityToModify.title = title || entityToModify.title;

    Object.entries(values).forEach(([propertyName, metadataValues]) => {
      entityToModify.metadata = entityToModify.metadata || {};
      // @ts-ignore
      entityToModify.metadata[propertyName] = metadataValues;
    });

    await entities.save(entityToModify, { user: {}, language: entityToModify.language });
  }

  async updateObsoleteMetadataValues(
    id: Entity['_id'],
    values: Record<string, EntityMetadata[]>
  ): Promise<void> {
    const stream = this.createBulkStream();

    await stream.updateOne(
      { _id: MongoIdHandler.mapToDb(id) },
      {
        $set: Object.fromEntries(
          Object.entries(values).map(([propertyName, metadataValues]) => [
            `metadata.${propertyName}`,
            metadataValues,
          ])
        ),
      }
    );
    await stream.updateOne(
      { _id: MongoIdHandler.mapToDb(id) },
      { $pull: { obsoleteMetadata: { $in: Object.keys(values) } } }
    );

    await stream.flush();
  }

  getObsoleteMetadata(sharedIds: string[], language: string) {
    const cursor = this.getCollection().find(
      { sharedId: { $in: sharedIds }, language },
      { projection: { sharedId: 1, obsoleteMetadata: 1 } }
    );

    return new MongoResultSet(cursor, result => ({
      sharedId: result.sharedId,
      obsoleteMetadata: result.obsoleteMetadata ?? [],
    }));
  }
}
