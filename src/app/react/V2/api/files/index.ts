import api from 'app/utils/api';
import { RequestParams } from 'app/utils/RequestParams';
import { IncomingHttpHeaders } from 'http';
import { FetchResponseError } from 'shared/JSONRequest';
import { FileType } from 'shared/types/fileType';

const getById = async (_id: string): Promise<FileType[]> => {
  try {
    const requestParams = new RequestParams({ _id });
    const { json: response } = await api.get('files', requestParams);
    return response;
  } catch (e) {
    return e;
  }
};

const getByType = async (
  type: FileType['type'],
  header?: IncomingHttpHeaders
): Promise<FileType[]> => {
  try {
    const requestParams = new RequestParams({ type }, header);
    const { json: response } = await api.get('files', requestParams);
    return response;
  } catch (e) {
    return e;
  }
};

const update = async (file: FileType): Promise<FileType | FetchResponseError> => {
  try {
    const requestParams = new RequestParams(file);
    const { json: response } = await api.post('files', requestParams);
    return response;
  } catch (e) {
    return e;
  }
};

const remove = async (_id: FileType['_id']): Promise<FileType | FetchResponseError> => {
  try {
    const requestParams = new RequestParams({ _id });
    const { json: response } = await api.delete('files', requestParams);
    return response[0];
  } catch (e) {
    return e;
  }
};

export { UploadService } from './UploadService';
export { getById, getByType, update, remove };
