import { ObjectId } from 'mongodb';
import { LanguageISO6391 } from 'shared/types/commonTypes';

export interface TranslationDBO {
  _id: ObjectId;
  language: LanguageISO6391;
  key: string;
  value: string;
  context: {
    type: 'Entity' | 'Relationship Type' | 'Uwazi UI' | 'Thesaurus';
    label: string;
    id: string;
  };
}
