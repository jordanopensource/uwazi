import Ajv from 'ajv';
import { UnauthorizedError } from 'api/authorization.v2/errors/UnauthorizedError';
import { ValidationError } from 'api/common.v2/validation/ValidationError';
import { FileNotFound } from 'api/files/FileNotFound';
import { S3TimeoutError } from 'api/files/S3Storage';
import { legacyLogger } from 'api/log';
import { appContext } from 'api/utils/AppContext';
import { createError } from 'api/utils/index';
import util from 'node:util';

const ajvPrettifier = error => {
  const errorMessage = [error.message];
  if (error.validations && error.validations.length) {
    error.validations.forEach(oneError => {
      errorMessage.push(`${oneError.instancePath}: ${oneError.message}`);
    });
  }
  return errorMessage.join('\n');
};

const fallbackPrettifier = (error, req) => {
  const url = req.originalUrl ? `\nurl: ${req.originalUrl}` : '';
  const body =
    req.body && Object.keys(req.body).length
      ? `\nbody: ${JSON.stringify(req.body, null, ' ')}`
      : '';
  const query =
    req.query && Object.keys(req.query).length
      ? `\nquery: ${JSON.stringify(req.query, null, ' ')}`
      : '';
  const errorString = `\n${error.message || JSON.stringify(error.json)}`;

  let errorMessage = `${url}${body}${query}${errorString}`;

  //if the resulting message is empty, or meaningless combination of characters ('{}')
  if (errorMessage.match(/^[{}\s]*$/g)) {
    errorMessage = JSON.stringify(error, null, 2);
  }

  return errorMessage;
};

const appendOriginalError = (message, originalError) =>
  `${message}\noriginal error: ${JSON.stringify(originalError, null, ' ')}`;

const obfuscateCredentials = req => {
  const obfuscated = req;
  if (req.body && req.body.password) {
    obfuscated.body.password = '########';
  }

  if (req.body && req.body.username) {
    obfuscated.body.username = '########';
  }

  return obfuscated;
};

// eslint-disable-next-line max-statements
const prettifyError = (error, { req = {}, uncaught = false } = {}) => {
  let result = error;

  if (error instanceof Error) {
    result = { code: 500, message: util.inspect(error), logLevel: 'error' };
  }

  if (error instanceof S3TimeoutError) {
    result = { code: 408, message: util.inspect(error), logLevel: 'debug' };
  }

  if (error instanceof Ajv.ValidationError) {
    result = { code: 422, message: error.message, validations: error.errors, logLevel: 'debug' };
  }

  if (error.name === 'ValidationError') {
    result = {
      code: 422,
      message: error.message,
      validations: error.properties,
      logLevel: 'debug',
    };
  }

  if (error instanceof ValidationError) {
    result = { code: 422, message: error.message, validations: error.errors, logLevel: 'debug' };
  }

  if (error instanceof UnauthorizedError) {
    result = { code: 401, message: error.message, logLevel: 'debug' };
  }

  if (error instanceof FileNotFound) {
    result = { code: 404, message: error.message, logLevel: 'debug' };
  }

  if (error.name === 'MongoError') {
    result.code = 500;
    result.logLevel = 'error';
  }

  if (error.message && error.message.match(/Cast to ObjectId failed for value/)) {
    result.code = 400;
    result.logLevel = 'debug';
  }

  if (error.message && error.message.match(/rison decoder error/)) {
    result.code = 400;
    result.logLevel = 'debug';
  }

  if (uncaught) {
    result.message = `uncaught exception or unhandled rejection, Node process finished !!\n ${result.message}`;
    result.logLevel = 'error';
    result.code = 500;
  }

  const obfuscatedRequest = obfuscateCredentials(req);
  result.prettyMessage = error.ajv
    ? ajvPrettifier(result)
    : fallbackPrettifier(result, obfuscatedRequest);

  return result;
};

const getErrorMessage = (data, error) => {
  const originalError = data.original || error;
  const prettyMessage = data.requestId
    ? `requestId: ${data.requestId} ${data.prettyMessage}`
    : data.prettyMessage;

  if (originalError instanceof Error) {
    const extendedError = appendOriginalError(prettyMessage, originalError);
    return data.tenantError
      ? `${extendedError}\n[Tenant error] ${data.tenantError.message}`
      : extendedError;
  }

  return prettyMessage;
};

const sendLog = (data, error, errorOptions) => {
  const messageToLog = getErrorMessage(data, error);
  if (data.logLevel === 'debug') {
    legacyLogger.debug(messageToLog, errorOptions);
    return;
  }

  legacyLogger.error(messageToLog, errorOptions);
};

function setRequestId(result) {
  try {
    return { ...result, requestId: appContext.get('requestId') };
  } catch (err) {
    return { ...result, tenantError: err };
  }
}

const simplifyError = (result, original) => {
  const processedError = { ...result };
  delete processedError.original;

  if (original instanceof Error && processedError.code === 500 && original.name !== 'MongoError') {
    processedError.prettyMessage = original.message;
    processedError.error = original.message;
    delete processedError.message;
  } else {
    processedError.prettyMessage = processedError.prettyMessage || original.message;
  }

  return processedError;
};

const handleError = (_error, { req = {}, uncaught = false, useContext = true } = {}) => {
  const errorData = typeof _error === 'string' ? createError(_error, 500) : _error;

  const error = errorData || new Error('Unexpected error has occurred');
  let result = prettifyError(error, { req, uncaught });

  if (useContext) {
    result = setRequestId(result);
  }

  sendLog(result, error, {});

  result = simplifyError(result, error);

  return result;
};

export { handleError, prettifyError };
