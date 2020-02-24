/* eslint-disable no-await-in-loop, max-statements */
import fs from 'fs';
import path from 'path';

import paths from 'api/config/paths';

const rename = async (current, newPath) =>
  new Promise((resolve, reject) => {
    fs.rename(current, newPath, err => {
      if (err === null) {
        resolve(true);
      }
      if (err) {
        reject(err);
      }
    });
  });

export const fileExists = async filePath =>
  new Promise((resolve, reject) => {
    fs.stat(filePath, err => {
      if (err === null) {
        resolve(true);
      }
      if (err && err.code === 'ENOENT') {
        resolve(false);
      }
      if (err) {
        reject(err);
      }
    });
  });

const oldThumbnailExists = async entity =>
  fileExists(path.join(paths.uploadedDocuments, `${entity._id}.jpg`));

export default {
  delta: 21,

  name: 'move_document_to_files',

  description: 'move document from the entity to the files collection',

  async up(db) {
    process.stdout.write(`${this.name}...\r\n`);

    const cursor = db.collection('entities').find({});

    let index = 1;

    while (await cursor.hasNext()) {
      const entity = await cursor.next();
      if (entity.file) {
        const { file, toc, fullText, processed, totalPages, pdfInfo, ...newEntity } = entity;

        const fileToCreate = {
          type: 'document',
          toc,
          fullText,
          processed,
          totalPages,
          pdfInfo,
          entity: entity.sharedId,
          ...file,
        };

        const [alreadyExists] = await db
          .collection('files')
          .find({ entity: entity.sharedId, filename: entity.file.filename })
          .toArray();

        if (!alreadyExists) {
          const {
            ops: [created],
          } = await db.collection('files').insert(fileToCreate);

          if (await oldThumbnailExists(entity)) {
            const thumbnailToCreate = {
              filename: `${created._id}.jpg`,
              type: 'thumbnail',
            };
            await db.collection('files').save(thumbnailToCreate);
            await rename(
              path.join(paths.uploadedDocuments, `${entity._id}.jpg`),
              path.join(paths.uploadedDocuments, thumbnailToCreate.filename)
            );
          }
        }

        await db.collection('entities').update({ _id: entity._id }, newEntity);

        process.stdout.write(` -> processed: ${index} \r`);
        index += 1;
      }
    }

    process.stdout.write('\r\n');
  },
};
