import { testingEnvironment } from 'api/utils/testingEnvironment';
import testingDB from 'api/utils/testing_db';
import { ObjectId } from 'mongodb';
import { DefaultTestingQueueAdapter } from 'api/queue.v2/configuration/factories';

const OTHER_QUEUE_JOB = {
  _id: new ObjectId(),
  queue: 'other queue',
  message: 'a simple message',
  lockedUntil: 0,
};

beforeEach(async () => {
  await testingEnvironment.setUp({
    jobs: [OTHER_QUEUE_JOB],
  });
});

afterAll(async () => {
  await testingEnvironment.tearDown();
});

it('should create a job in the given queue with the given message', async () => {
  const NOW_VALUE = 1;
  jest.spyOn(Date, 'now').mockImplementation(() => NOW_VALUE);
  const adapter = DefaultTestingQueueAdapter();

  const result = await adapter.pushJob({
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    namespace: 'namespace',
    options: {
      lockWindow: 500,
    },
  });

  const messages = await testingDB.mongodb?.collection('jobs').find({}).toArray();
  expect(messages).toEqual([
    OTHER_QUEUE_JOB,
    {
      _id: new ObjectId(result),
      queue: 'queue name',
      name: 'a simple message',
      params: {},
      lockedUntil: 0,
      createdAt: NOW_VALUE,
      namespace: 'namespace',
      options: {
        lockWindow: 500,
      },
    },
  ]);
});

it('should return null if no jobs in the queue', async () => {
  const adapter = DefaultTestingQueueAdapter();

  const result = await adapter.pickJob('queue name');

  expect(result).toBe(null);
});

it('should only return non-locked jobs', async () => {
  const adapter = DefaultTestingQueueAdapter();
  let NOW_VALUE = 1;
  jest.spyOn(Date, 'now').mockImplementation(() => NOW_VALUE);
  const job = {
    _id: new ObjectId(),
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    namespace: 'namespace',
    lockedUntil: 10,
    options: {
      lockWindow: 1000,
    },
  };
  await testingDB.mongodb?.collection('jobs').insertOne(job);

  let result = await adapter.pickJob('queue name');

  expect(result).toBe(null);
  expect(await testingDB.mongodb?.collection('jobs').find({}).toArray()).toEqual([
    OTHER_QUEUE_JOB,
    job,
  ]);

  NOW_VALUE = 11;
  result = await adapter.pickJob('queue name');

  expect(result).toEqual({
    id: job._id.toHexString(),
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    namespace: 'namespace',
    lockedUntil: 1000 + NOW_VALUE,
    options: {
      lockWindow: 1000,
    },
  });
  expect(await testingDB.mongodb?.collection('jobs').find({}).toArray()).toEqual([
    OTHER_QUEUE_JOB,
    {
      ...job,
      lockedUntil: NOW_VALUE + 1000,
    },
  ]);
});

it('should atomically get a job and lock it for 1000ms', async () => {
  const adapter = DefaultTestingQueueAdapter();
  const NOW_VALUE = 11;
  jest.spyOn(Date, 'now').mockReturnValue(NOW_VALUE);
  const job = {
    _id: new ObjectId(),
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    namespace: 'namespace',
    lockedUntil: 10,
    options: {
      lockWindow: 1000,
    },
  };
  await testingDB.mongodb?.collection('jobs').insertOne(job);

  const result = await adapter.pickJob('queue name');

  expect(result).toEqual({
    id: job._id.toHexString(),
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    namespace: 'namespace',
    lockedUntil: 1000 + NOW_VALUE,
    options: {
      lockWindow: 1000,
    },
  });
});

const job1 = {
  _id: new ObjectId(),
  queue: 'queue name',
  message: 'a simple message',
  lockedUntil: 0,
  createdAt: 1,
};
const job2 = {
  _id: new ObjectId(),
  queue: 'queue name',
  message: 'another simple message',
  lockedUntil: 0,
  createdAt: 2,
};

it.each([
  { first: job1, second: job2 },
  { first: job2, second: job1 },
])('should get the oldest job possible', async ({ first, second }) => {
  const adapter = DefaultTestingQueueAdapter();
  const NOW_VALUE = 1;
  jest.spyOn(Date, 'now').mockReturnValue(NOW_VALUE);

  await testingDB.mongodb?.collection('jobs').insertMany([first, second]);

  const result1 = await adapter.pickJob('queue name');
  const result2 = await adapter.pickJob('queue name');
  expect(result1 && result1.id).toBe(job1._id.toHexString());
  expect(result2 && result2.id).toBe(job2._id.toHexString());
});

it('should increment the lock of a job the amount of miliseconds given by lockWindow', async () => {
  const adapter = DefaultTestingQueueAdapter();
  const NOW_VALUE = 1;
  jest.spyOn(Date, 'now').mockReturnValue(NOW_VALUE);
  const job = {
    _id: new ObjectId(),
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    lockedUntil: 0,
    createdAt: NOW_VALUE,
    namespace: 'namespace',
    options: {
      lockWindow: 2000,
    },
  };
  await testingDB.mongodb?.collection('jobs').insertOne(job);

  await adapter.renewJobLock({ ...job, id: job._id.toHexString() });

  expect(await testingDB.mongodb?.collection('jobs').find({}).toArray()).toEqual([
    OTHER_QUEUE_JOB,
    {
      ...job,
      lockedUntil: NOW_VALUE + 2000,
    },
  ]);
});

it('should delete a job', async () => {
  const adapter = DefaultTestingQueueAdapter();
  const NOW_VALUE = 1;
  jest.spyOn(Date, 'now').mockReturnValue(NOW_VALUE);
  const job = {
    _id: new ObjectId(),
    queue: 'queue name',
    name: 'a simple message',
    params: {},
    lockedUntil: 0,
    createdAt: NOW_VALUE,
    namespace: 'namespace',
    options: {
      lockWindow: 2000,
    },
  };
  await testingDB.mongodb?.collection('jobs').insertOne(job);

  await adapter.deleteJob({ ...job, id: job._id.toHexString() });

  expect(await testingDB.mongodb?.collection('jobs').find({}).toArray()).toEqual([OTHER_QUEUE_JOB]);
});
