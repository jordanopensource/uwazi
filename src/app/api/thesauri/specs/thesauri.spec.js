/* eslint-disable max-lines */
import _ from 'lodash';

import translations from 'api/i18n/translations';
import templates from 'api/templates/templates';
import entities from 'api/entities/entities';
import { search } from 'api/search';
import { getFixturesFactory } from 'api/utils/fixturesFactory';
import { testingDB } from 'api/utils/testing_db';
import { thesauri } from '../thesauri.js';
import {
  fixtures,
  dictionaryId,
  dictionaryIdToTranslate,
  dictionaryValueId,
  dictionaryWithValueGroups,
} from './fixtures';

const factory = getFixturesFactory();

describe('thesauri', () => {
  beforeEach(async () => {
    jest.spyOn(search, 'indexEntities').mockImplementation(async () => Promise.resolve());
    await testingDB.setupFixturesAndContext(fixtures);
  });

  afterAll(async () => {
    await testingDB.disconnect();
    search.indexEntities.mockRestore();
  });

  describe('get()', () => {
    it('should return all thesauri including entity templates as options', async () => {
      search.indexEntities.mockRestore();
      const elasticIndex = 'thesauri.spec.elastic.index';
      await testingDB.setupFixturesAndContext(fixtures, elasticIndex);
      const thesaurus = await thesauri.get(null, 'es');

      expect(thesaurus[0]).toMatchObject({ name: 'dictionary' });
      expect(thesaurus[1]).toMatchObject({ name: 'dictionary 2' });

      expect(thesaurus[4]).toMatchObject({
        name: 'entityTemplate',
        values: [{ label: 'spanish entity' }],
        optionsCount: 3,
      });

      expect(thesaurus[5]).toMatchObject({
        name: 'documentTemplate',
        values: [{ label: 'document' }, { label: 'document 2' }],
        optionsCount: 2,
      });
    });

    it('should return all thesauri including unpublished documents if user', async () => {
      const dictionaries = await thesauri.get(null, 'es', 'user');
      expect(dictionaries.length).toBe(6);
      expect(dictionaries[4].values.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
        { id: 'other', label: 'unpublished entity' },
        { id: 'sharedId', label: 'spanish entity', icon: { type: 'Icon' } },
        { id: 'sharedId2' },
      ]);
    });

    describe('when passing id', () => {
      it('should return matching thesauri', async () => {
        const response = await thesauri.get(dictionaryId);
        expect(response[0].name).toBe('dictionary 2');
        expect(response[0].values[0].label).toBe('value 1');
        expect(response[0].values[1].label).toBe('Parent');
        expect(response[0].values[1].values[0].label).toBe('value 2');
      });
    });
  });

  describe('dictionaries()', () => {
    it('should return all dictionaries', async () => {
      const dictionaries = await thesauri.dictionaries();
      expect(dictionaries.length).toBe(4);
      expect(dictionaries[0].name).toBe('dictionary');
      expect(dictionaries[1].name).toBe('dictionary 2');
      expect(dictionaries[2].name).toBe('Top 2 scify books');
      expect(dictionaries[3].name).toBe('Top movies');
    });

    describe('when passing a query', () => {
      it('should return matching thesauri', async () => {
        const response = await thesauri.dictionaries({ _id: dictionaryId });
        expect(response.length).toBe(1);
        expect(response[0].name).toBe('dictionary 2');
        expect(response[0].values[0].label).toBe('value 1');
        expect(response[0].values[1].label).toBe('Parent');
        expect(response[0].values[1].values[0].label).toBe('value 2');
      });
    });
  });

  describe('delete()', () => {
    let templatesCountSpy;
    beforeEach(() => {
      templatesCountSpy = jest.spyOn(templates, 'countByThesauri').mockImplementation(async () => {
        Promise.resolve(0);
      });
      jest.spyOn(translations, 'deleteContext').mockImplementation(async () => Promise.resolve());
    });

    afterAll(() => {
      templatesCountSpy.mockRestore();
      translations.deleteContext.mockRestore();
    });

    it('should delete a thesauri', async () => {
      const response = await thesauri.delete(dictionaryId);
      expect(response.ok).toBe(true);

      const dictionaries = await thesauri.get({ _id: dictionaryId });
      expect(dictionaries.length).toBe(0);
    });

    it('should delete the translation', async () => {
      const response = await thesauri.delete(dictionaryId);
      expect(response.ok).toBe(true);
      expect(translations.deleteContext).toHaveBeenCalledWith(dictionaryId);
    });

    describe('when the dictionary is in use', () => {
      it('should return an error in the response', async () => {
        try {
          templatesCountSpy.mockImplementation(async () => Promise.resolve(1));
          await thesauri.delete(dictionaryId);
          throw new Error('should return an error in the response');
        } catch (response) {
          expect(response.key).toBe('templates_using_dictionary');
        }
      });
    });
  });

  describe('save', () => {
    beforeEach(() => {
      jest.spyOn(translations, 'updateContext').mockImplementation(async () => Promise.resolve());
    });

    afterAll(() => {
      translations.updateContext.mockRestore();
    });

    it('should create a thesauri', async () => {
      const _id = testingDB.id();
      const data = { name: 'Batman wish list', values: [{ _id, id: '1', label: 'Joker BFF' }] };

      const response = await thesauri.save(data);
      expect(response.values).toEqual([{ _id, id: '1', label: 'Joker BFF' }]);
    });

    it('should create a translation context', async () => {
      const data = {
        name: 'Batman wish list',
        values: [
          { id: '1', label: 'Joker BFF' },
          {
            label: 'Heroes',
            values: [
              { id: '2', label: 'Batman' },
              { id: '3', label: 'Robin' },
            ],
          },
        ],
      };
      jest.spyOn(translations, 'addContext').mockImplementation(async () => Promise.resolve());
      const response = await thesauri.save(data);
      expect(translations.addContext).toHaveBeenCalledWith(
        response._id,
        'Batman wish list',
        {
          Batman: 'Batman',
          'Batman wish list': 'Batman wish list',
          Heroes: 'Heroes',
          'Joker BFF': 'Joker BFF',
          Robin: 'Robin',
        },
        'Thesaurus'
      );
      translations.addContext.mockRestore();
    });

    it('should set a default value of [] to values property if its missing', async () => {
      const data = { name: 'Scarecrow nightmares' };

      await thesauri.save(data);
      const response = await thesauri.get();
      const newThesauri = response.find(thesaurus => thesaurus.name === 'Scarecrow nightmares');

      expect(newThesauri.name).toBe('Scarecrow nightmares');
      expect(newThesauri.values).toEqual([]);
    });

    describe('when passing _id', () => {
      it('should edit an existing one', async () => {
        jest.spyOn(translations, 'addContext').mockImplementation(async () => Promise.resolve());
        const data = { _id: dictionaryId, name: 'changed name' };
        await thesauri.save(data);

        const edited = await thesauri.getById(dictionaryId);
        expect(edited.name).toBe('changed name');
        translations.addContext.mockRestore();
      });

      it('should update the translation', async () => {
        const data = {
          _id: dictionaryIdToTranslate,
          name: 'Top 1 games',
          values: [{ id: dictionaryValueId, label: 'Marios game' }],
        };
        const response = await thesauri.save(data);
        expect(translations.updateContext).toHaveBeenCalledWith(
          { id: response._id.toString(), label: 'Top 1 games', type: 'Thesaurus' },
          { 'Top 2 scify books': 'Top 1 games', 'Enders game': 'Marios game' },
          ['Fundation'],
          { 'Top 1 games': 'Top 1 games', 'Marios game': 'Marios game' }
        );
      });

      it('should remove deleted values from entities', async () => {
        jest.spyOn(entities, 'deleteThesaurusFromMetadata').mockImplementation(() => {});
        const data = {
          _id: dictionaryIdToTranslate,
          name: 'Top 1 games',
          values: [{ id: dictionaryValueId, label: 'Marios game' }],
        };

        await thesauri.save(data);
        expect(entities.deleteThesaurusFromMetadata.mock.calls.length).toBe(1);
        expect(entities.deleteThesaurusFromMetadata).toHaveBeenCalledWith(
          '2',
          dictionaryIdToTranslate
        );
        entities.deleteThesaurusFromMetadata.mockRestore();
      });

      it('should properly delete values when thesauri have subgroups', async () => {
        jest.spyOn(entities, 'deleteThesaurusFromMetadata').mockImplementation(() => {});
        const thesaurus = await thesauri.getById(dictionaryWithValueGroups);
        thesaurus.values = thesaurus.values.filter(value => value.id !== '3');

        await thesauri.save(thesaurus);

        const deletedValuesFromEntities = entities.deleteThesaurusFromMetadata.mock.calls[0][0];

        expect(deletedValuesFromEntities).toEqual('3');
        entities.deleteThesaurusFromMetadata.mockRestore();
      });

      it('should update labels on entities with the thesauri values', async () => {
        const thesaurus = {
          name: 'dictionary 2',
          _id: dictionaryId,
          values: [
            { id: '1', label: 'value 1 changed' },
            { id: '3', label: 'Parent', values: [{ id: '2', label: 'value 2' }] },
          ],
        };

        await thesauri.save(thesaurus);

        const changedEntities = await entities.get({ language: 'es' });

        expect(changedEntities[0].metadata).toEqual(
          expect.objectContaining({
            multiselect: [{ value: '1', label: 'value 1 changed' }],
          })
        );
        expect(changedEntities[1].metadata).toEqual(
          expect.objectContaining({
            multiselect: [
              { value: '1', label: 'value 1 changed' },
              { value: '2', label: 'value 2', parent: { value: '3', label: 'Parent' } },
            ],
          })
        );
      });

      it('should update parent label on entities with child values', async () => {
        const thesaurus = {
          name: 'dictionary 2',
          _id: dictionaryId,
          values: [
            { id: '1', label: 'value 1' },
            { id: '3', label: 'Parent changed', values: [{ id: '2', label: 'value 2' }] },
          ],
        };

        await thesauri.save(thesaurus);

        const changedEntities = await entities.get({ language: 'es' });

        expect(changedEntities[0].metadata).toEqual(
          expect.objectContaining({
            multiselect: [{ value: '1', label: 'value 1' }],
          })
        );

        expect(changedEntities[1].metadata).toEqual(
          expect.objectContaining({
            multiselect: [
              { value: '1', label: 'value 1' },
              { value: '2', label: 'value 2', parent: { value: '3', label: 'Parent changed' } },
            ],
          })
        );
      });
    });

    describe('validation', () => {
      describe('when trying to save a duplicated thesauri', () => {
        it('should return an error', async () => {
          const data = { name: 'dictionary' };

          let error;
          try {
            await thesauri.save(data);
          } catch (e) {
            error = e;
          }

          expect(error).toBeDefined();
        });

        it('should not fail when name is contained as substring on another thesauri name', async () => {
          const data = { name: 'ary' };

          const thesaurus = await thesauri.save(data);
          expect(thesaurus.name).toBe('ary');
        });

        it('should fail if the name is blank', async () => {
          let data = { values: [{ label: 'test' }] };
          try {
            await thesauri.save(data);
            fail('should throw error');
          } catch (e) {
            expect(e).toBeDefined();
          }

          data = { name: '', values: [{ label: 'test' }] };
          try {
            await thesauri.save(data);
            fail('should throw error');
          } catch (e) {
            expect(e).toBeDefined();
          }
        });
      });

      describe('when passing a blank value', () => {
        it('should return an error', async () => {
          const data = {
            name: 'thesauri_with_blank_value',
            values: [
              {
                label: '',
              },
            ],
          };

          let error;
          try {
            await thesauri.save(data);
          } catch (e) {
            error = e;
          }

          expect(error).toBeDefined();
        });
      });

      describe('when trying to save duplicated labels', () => {
        it.each([
          {
            case: 'root',
            values: [
              { label: 'duplicated_label' },
              { label: 'other_label' },
              { label: 'duplicated_label' },
            ],
            expectedMessage: 'Duplicated labels: duplicated_label.',
          },
          {
            case: 'group',
            values: [
              {
                label: 'group',
                values: [
                  { label: 'duplicated_label' },
                  { label: 'other_label' },
                  { label: 'duplicated_label' },
                ],
              },
            ],
            expectedMessage: 'Duplicated labels: group/duplicated_label.',
          },
        ])('should not allow duplication in $case', async ({ values, expectedMessage }) => {
          const toSave = { name: 'test_thesaurus', values };
          try {
            await thesauri.save(toSave);
            fail('should throw error');
          } catch (e) {
            expect(e).toBeDefined();
            expect(e.message).toBe('validation failed');
            expect(e.ajv).toBe(true);
            expect(e.errors).toMatchObject([
              {
                message: expectedMessage,
              },
            ]);
          }
        });

        it('should allow same labels in different groups and/or root', async () => {
          const toSave = {
            name: 'test_thesaurus',
            values: [
              { label: 'same_label' },
              { label: 'first_group', values: [{ label: 'same_label' }] },
              { label: 'second_group', values: [{ label: 'same_label' }] },
            ],
          };

          const response = await thesauri.save(toSave);
          expect(response).toMatchObject({
            _id: expect.anything(),
            name: 'test_thesaurus',
            values: [
              { label: 'same_label', id: expect.anything() },
              {
                label: 'first_group',
                id: expect.anything(),
                values: [{ label: 'same_label', id: expect.anything() }],
              },
              {
                label: 'second_group',
                id: expect.anything(),
                values: [{ label: 'same_label', id: expect.anything() }],
              },
            ],
          });
        });
      });
    });
  });

  describe('update', () => {
    describe('when the name of thesaurus is updated', () => {
      it('should update the translations key', async () => {
        const data = { ...fixtures.dictionaries[1], name: 'new name' };
        const response = await thesauri.save(data);
        data.values.push({ id: '3', label: 'value 3' });
        await thesauri.save(data);
        const allTranslations = await translations.get({ locale: 'es' });
        const context = allTranslations[0].contexts.find(c => c.id === response._id.toString());
        expect(context.values['new name']).toBe('new name');
      });
    });

    describe('when changing elements', () => {
      let db;
      let translationsV2Collection;

      beforeEach(async () => {
        db = testingDB.mongodb;
        translationsV2Collection = db.collection('translationsV2');
      });

      describe('creating new elements', () => {
        it('should create the translation key', async () => {
          const data = {
            name: 'Test Thesaurus',
            values: [{ id: '1', label: 'A' }],
          };
          const response = await thesauri.save(data);
          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': response._id.toString(),
            })
            .toArray();

          expect(relatedTranslations).toMatchObject([
            { key: 'A', language: 'es' },
            { key: 'A', language: 'en' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
          ]);
        });

        it('should not try to duplicate a translation', async () => {
          const data = {
            name: 'Test Thesaurus',
            values: [{ id: '1', label: 'A' }],
          };
          const response = await thesauri.save(data);
          const id = response._id.toString();
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'A',
              language: 'es',
            },
            { $set: { value: 'Aes' } }
          );
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'A',
              language: 'en',
            },
            { $set: { value: 'Aen' } }
          );

          data._id = id;
          data.values.push({ id: '2', label: 'group', values: [{ id: '3', label: 'A' }] });
          await thesauri.save(data);

          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();

          expect(relatedTranslations).toMatchObject([
            { key: 'A', language: 'es', value: 'Aes' },
            { key: 'A', language: 'en', value: 'Aen' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
        });
      });

      describe('deleting elements', () => {
        let id;

        beforeEach(async () => {
          const thesaurusData = {
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'A' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'A' }] },
            ],
          };
          const response = await thesauri.save(thesaurusData);
          id = response._id.toString();
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'A',
              language: 'es',
            },
            { $set: { value: 'Aes' } }
          );
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'A',
              language: 'en',
            },
            { $set: { value: 'Aen' } }
          );
        });

        it('should not delete the translation key if it is still used by another element', async () => {
          let relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'A', language: 'es', value: 'Aes' },
            { key: 'A', language: 'en', value: 'Aen' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
          const data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [{ id: '1', label: 'A' }],
          };
          await thesauri.save(data);
          relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'A', language: 'es', value: 'Aes' },
            { key: 'A', language: 'en', value: 'Aen' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
          ]);
        });

        it('should delete the translation key if it is not used by another element', async () => {
          const data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [{ id: '2', label: 'group' }],
          };
          await thesauri.save(data);
          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
        });
      });

      describe('updating elements', () => {
        let id;

        beforeEach(async () => {
          const thesaurusData = {
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'A' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'A' }] },
              { id: '4', label: 'C' },
            ],
          };
          const response = await thesauri.save(thesaurusData);
          id = response._id.toString();
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'A',
              language: 'es',
            },
            { $set: { value: 'Aes' } }
          );
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'A',
              language: 'en',
            },
            { $set: { value: 'Aen' } }
          );
          await translationsV2Collection.updateOne(
            {
              'context.id': id,
              key: 'C',
              language: 'es',
            },
            { $set: { value: 'Ces' } }
          );
        });

        it('should update the key, but change only the default language translation, when all of the same elements are changed at once', async () => {
          const data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'B' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'B' }] },
              { id: '4', label: 'C' },
            ],
          };
          await thesauri.save(data);
          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'B', language: 'es', value: 'B' },
            { key: 'B', language: 'en', value: 'Aen' },
            { key: 'C', language: 'es', value: 'Ces' },
            { key: 'C', language: 'en', value: 'C' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
        });

        it('should add a new translations, when an element gets a new label, but the old one is still in use by other elements', async () => {
          const data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'A' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'B' }] },
              { id: '4', label: 'C' },
            ],
          };
          await thesauri.save(data);
          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'A', language: 'es', value: 'Aes' },
            { key: 'A', language: 'en', value: 'Aen' },
            { key: 'B', language: 'es', value: 'B' },
            { key: 'B', language: 'en', value: 'B' },
            { key: 'C', language: 'es', value: 'Ces' },
            { key: 'C', language: 'en', value: 'C' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
        });

        it('should add no new translation, when a label gets updated to another already existing label', async () => {
          const data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'A' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'C' }] },
              { id: '4', label: 'C' },
            ],
          };
          await thesauri.save(data);
          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'A', language: 'es', value: 'Aes' },
            { key: 'A', language: 'en', value: 'Aen' },
            { key: 'C', language: 'es', value: 'Ces' },
            { key: 'C', language: 'en', value: 'C' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
        });

        it('should remove translations when the last element using it is changed to something else', async () => {
          let data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'A' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'B' }] },
              { id: '4', label: 'C' },
            ],
          };
          await thesauri.save(data);
          data = {
            _id: id,
            name: 'Test Thesaurus',
            values: [
              { id: '1', label: 'B' },
              { id: '2', label: 'group', values: [{ id: '3', label: 'B' }] },
              { id: '4', label: 'C' },
            ],
          };
          await thesauri.save(data);
          const relatedTranslations = await translationsV2Collection
            .find({
              'context.id': id,
            })
            .toArray();
          expect(relatedTranslations).toMatchObject([
            { key: 'B', language: 'es', value: 'B' },
            { key: 'B', language: 'en', value: 'B' },
            { key: 'C', language: 'es', value: 'Ces' },
            { key: 'C', language: 'en', value: 'C' },
            { key: 'Test Thesaurus', language: 'es' },
            { key: 'Test Thesaurus', language: 'en' },
            { key: 'group', language: 'es' },
            { key: 'group', language: 'en' },
          ]);
        });
      });
    });
  });

  describe('appendValues', () => {
    const base = factory.nestedThesauri('base_thesaurus', [
      '1',
      '2',
      {
        A: ['A1', 'A2'],
        B: ['B1'],
      },
    ]);

    it.each([
      {
        case: 'add root value',
        addition: [
          {
            label: '3',
          },
        ],
        expectedValues: [
          ...base.values,
          {
            label: '3',
          },
        ],
      },
      {
        case: 'add root values',
        addition: [
          {
            label: '3',
          },
          {
            label: '4',
          },
        ],
        expectedValues: [
          ...base.values,
          {
            label: '3',
          },
          {
            label: '4',
          },
        ],
      },
      {
        case: 'add group',
        addition: [
          {
            label: 'C',
            values: [
              {
                label: 'C3',
              },
            ],
          },
        ],
        expectedValues: [
          ...base.values,
          {
            label: 'C',
            values: [
              {
                label: 'C3',
              },
            ],
          },
        ],
      },
      {
        case: 'add groups',
        addition: [
          {
            label: 'C',
            values: [
              {
                label: 'C3',
              },
            ],
          },
          {
            label: 'D',
            values: [
              {
                label: 'D1',
              },
              {
                label: 'D2',
              },
            ],
          },
        ],
        expectedValues: [
          ...base.values,
          {
            label: 'C',
            values: [
              {
                label: 'C3',
              },
            ],
          },
          {
            label: 'D',
            values: [
              {
                label: 'D1',
              },
              {
                label: 'D2',
              },
            ],
          },
        ],
      },
      {
        case: 'append to group',
        addition: [
          {
            label: 'A',
            values: [
              {
                label: 'A3',
              },
              {
                label: 'A4',
              },
            ],
          },
          {
            label: 'B',
            values: [
              {
                label: 'B2',
              },
            ],
          },
        ],
        expectedValues: [
          base.values[0],
          base.values[1],
          {
            label: 'A',
            values: [
              ...base.values[2].values,
              {
                label: 'A3',
              },
              {
                label: 'A4',
              },
            ],
          },
          {
            label: 'B',
            values: [
              ...base.values[3].values,
              {
                label: 'B2',
              },
            ],
          },
        ],
      },
      {
        case: 'not add repeated root values',
        addition: [
          {
            label: '1',
          },
        ],
        expectedValues: base.values,
      },
      {
        case: 'not add repeated group values',
        addition: [
          {
            label: 'A',
            values: [
              {
                label: 'A1',
              },
            ],
          },
        ],
        expectedValues: base.values,
      },
      {
        case: 'should ignore case when checking for repetition',
        addition: [
          {
            label: 'a',
            values: [
              {
                label: 'A1',
              },
            ],
          },
          {
            label: 'A',
            values: [
              {
                label: 'a1',
              },
            ],
          },
        ],
        expectedValues: base.values,
      },
      {
        case: 'ignore case in the addition',
        addition: [{ label: 'root' }, { label: 'Root' }, { label: 'ROOT' }],
        expectedValues: [...base.values, { label: 'root' }],
      },
      {
        case: 'split group additions and properly ignore case when needed',
        addition: [
          { label: 'A', values: [{ label: 'a2' }, { label: 'A3' }, { label: 'a3' }] },
          { label: 'a', values: [{ label: 'a3' }, { label: 'A4' }] },
          { label: 'C', values: [{ label: 'C1' }, { label: 'c1' }] },
          { label: 'C', values: [{ label: 'c1' }, { label: 'C2' }, { label: 'c1' }] },
        ],
        expectedValues: [
          base.values[0],
          base.values[1],
          { label: 'A', values: [...base.values[2].values, { label: 'A3' }, { label: 'A4' }] },
          base.values[3],
          { label: 'C', values: [{ label: 'C1' }, { label: 'C2' }] },
        ],
      },
      {
        case: 'handle complex cases',
        addition: [
          { label: '2' },
          { label: '3' },
          { label: 'a', values: [{ label: 'A3' }] },
          { label: 'B', values: [{ label: 'b1' }, { label: 'B2' }] },
          { label: 'C', values: [{ label: 'C1' }, { label: 'C2' }] },
        ],
        expectedValues: [
          base.values[0],
          base.values[1],
          { label: 'A', values: [...base.values[2].values, { label: 'A3' }] },
          { label: 'B', values: [...base.values[3].values, { label: 'B2' }] },
          { label: '3' },
          { label: 'C', values: [{ label: 'C1' }, { label: 'C2' }] },
        ],
      },
    ])('should $case', async ({ addition, expectedValues }) => {
      const baseClone = _.cloneDeep(base);
      const modified = thesauri.appendValues(baseClone, addition);
      expect(modified.values).toMatchObject(expectedValues);
      expect(baseClone).toEqual(base);
    });
  });
});
