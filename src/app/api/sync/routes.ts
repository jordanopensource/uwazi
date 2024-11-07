import multer from 'multer';

import { models, WithId } from 'api/odm';
import { search } from 'api/search';

import { storage, uploadMiddleware } from 'api/files';
import { updateMapping } from 'api/search/entitiesIndex';
import { Application, Request } from 'express';
import { TranslationType } from 'shared/translationType';
import { FileType } from 'shared/types/fileType';

import { TemplateSchema } from 'shared/types/templateType';
import { needsAuthorization } from '../auth';

const diskStorage = multer.diskStorage({
  filename(_req, file, cb) {
    cb(null, file.originalname);
  },
});

const indexEntities = async (req: Request) => {
  if (req.body.namespace === 'entities') {
    await search.indexEntities({ _id: req.body.data._id }, '+fullText');
  }

  if (req.body.namespace === 'files') {
    await search.indexEntities({ sharedId: req.body.data.entity }, '+fullText');
  }
};

const updateMappings = async (req: Request) => {
  if (req.body.namespace === 'templates') {
    await updateMapping(Array.isArray(req.body.data) ? req.body.data : [req.body.data]);
  }
};

const deleteFileFromIndex = async (file: FileType) =>
  search.indexEntities({ sharedId: file.entity });

const deleteEntityFromIndex = async (entityId: string) => {
  try {
    await search.delete({ _id: entityId });
  } catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
  }
};

const deleteFromIndex = async (req: Request<{}, {}, {}, { data: string; namespace: string }>) => {
  if (req.query.namespace === 'entities') {
    await deleteEntityFromIndex(JSON.parse(req.query.data)._id);
  }
};

const deleteFile = async (fileId: string) => {
  const file: WithId<FileType> | undefined = await models.files().getById(fileId);
  if (file) {
    await storage.removeFile(file.filename || '', file.type || 'document');
    await deleteFileFromIndex(file);
  }
  return file;
};

const preserveTranslations = async (syncData: TranslationType): Promise<TranslationType> => {
  const [translation] = (await models
    .translations()
    .get({ _id: syncData._id })) as TranslationType[];
  if (!translation) {
    return syncData;
  }
  const menu = translation.contexts?.find(c => c.id === 'Menu');
  const filters = translation.contexts?.find(c => c.id === 'Filters');
  if (menu) {
    syncData.contexts?.push(menu);
  }
  if (filters) {
    syncData.contexts?.push(filters);
  }
  return syncData;
};

const keepOnlyOneDefaultTemplate = async (
  syncData: TemplateSchema | TemplateSchema[]
): Promise<TemplateSchema | TemplateSchema[]> => {
  const syncDataArray = Array.isArray(syncData) ? syncData : [syncData];
  const syncedDefault = syncDataArray.find(template => template.default);
  if (syncedDefault) {
    const [otherDefault] = (await models
      .templates()
      .get({ _id: { $ne: syncedDefault._id }, default: true })) as TemplateSchema[];
    if (otherDefault) {
      return [
        {
          ...otherDefault,
          default: false,
        },
        ...syncDataArray,
      ];
    }
  }

  return syncData;
};

export default (app: Application) => {
  app.post('/api/sync', needsAuthorization(['admin']), async (req, res, next) => {
    try {
      if (req.body.namespace === 'settings') {
        const [settings] = await models.settings().get({});
        req.body.data._id = settings._id;
      }

      if (req.body.namespace === 'translations') {
        req.body.data = await preserveTranslations(req.body.data);
      }

      if (req.body.namespace === 'templates') {
        req.body.data = await keepOnlyOneDefaultTemplate(req.body.data);
      }

      await (Array.isArray(req.body.data)
        ? models[req.body.namespace]().saveMultiple(req.body.data)
        : models[req.body.namespace]().save(req.body.data));

      await updateMappings(req);
      await indexEntities(req);

      res.json('ok');
    } catch (e) {
      next(e);
    }
  });

  app.post(
    '/api/sync/upload',
    needsAuthorization(['admin']),
    uploadMiddleware.customStorage(diskStorage, 'document'),
    (_req, res) => {
      res.json('ok');
    }
  );

  app.post(
    '/api/sync/upload/custom',
    needsAuthorization(['admin']),
    uploadMiddleware.customStorage(diskStorage, 'custom'),
    (_req, res) => {
      res.json('ok');
    }
  );

  app.delete(
    '/api/sync',
    needsAuthorization(['admin']),
    async (req: Request<{}, {}, {}, { data: string; namespace: string }>, res) => {
      await models[req.query.namespace]().delete(JSON.parse(req.query.data));

      if (req.query.namespace === 'files') {
        await deleteFile(JSON.parse(req.query.data)._id);
      }

      if (req.query.namespace === 'entities') {
        await deleteFromIndex(req);
      }

      res.json('ok');
    }
  );
};
