/* eslint-disable max-statements */
/* eslint-disable no-void */
/* eslint-disable max-classes-per-file */
import { Dispatchable, HeartbeatCallback } from 'api/queue.v2/application/contracts/Dispatchable';
import { testingEnvironment } from 'api/utils/testingEnvironment';
import { DefaultTestingQueueAdapter } from 'api/queue.v2/configuration/factories';
import { NamespacedDispatcher } from '../NamespacedDispatcher';
import { QueueWorker } from '../QueueWorker';
import { createSignals } from './Signals';

async function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

class TestJob implements Dispatchable {
  private signal: (index: string) => void;

  private logger: (message: string, index: number) => void;

  constructor(signal: (index: string) => void, logger: (message: string, index: number) => void) {
    this.signal = signal;
    this.logger = logger;
  }

  async handleDispatch(
    _heartbeat: HeartbeatCallback,
    params: { data: { pieceOfData: string[] }; aNumber: number }
  ): Promise<void> {
    this.signal(`starting-${params.aNumber}`);
    await sleep(50);
    this.logger(`${params.aNumber}, ${params.data.pieceOfData.join('|')}`, params.aNumber);
    this.signal(`ending-${params.aNumber}`);
  }
}

beforeEach(async () => {
  await testingEnvironment.setUp({});
});

afterAll(async () => {
  await testingEnvironment.tearDown();
});

it('should process all the jobs', async () => {
  const output: string[] = [];
  const adapter = DefaultTestingQueueAdapter();
  const dispatcher1 = new NamespacedDispatcher('namespace1', 'name', adapter);
  const dispatcher2 = new NamespacedDispatcher('namespace2', 'name', adapter);

  const worker = new QueueWorker('name', adapter, () => {});

  const signals = createSignals();

  worker.register(
    TestJob,
    async namespace =>
      new TestJob(signals.signal, message => output.push(`${namespace} ${message}`))
  );

  const dispatch = async (params: any, i: number) => {
    await sleep(5);
    return (i % 2 ? dispatcher2 : dispatcher1).dispatch(TestJob, params);
  };

  await dispatch({ data: { pieceOfData: ['.'] }, aNumber: 1 }, 0);
  await dispatch({ data: { pieceOfData: ['.', '.'] }, aNumber: 2 }, 1);
  await dispatch({ data: { pieceOfData: ['.', '.', '.'] }, aNumber: 3 }, 2);
  output.push('finished enqueueing jobs pre worker.start');
  await sleep(5);
  await Promise.all([
    worker.start(),
    dispatch({ data: { pieceOfData: ['.', '.', '.', '.'] }, aNumber: 4 }, 0)
      .then(
        void dispatch({ data: { pieceOfData: ['.', '.', '.', '.', '.'] }, aNumber: 5 }, 1).then(
          void dispatch({ data: { pieceOfData: ['.', '.', '.', '.', '.', '.'] }, aNumber: 6 }, 2)
        )
      )
      .then(async () => {
        output.push('finished enqueueing jobs post worker.start');
        await signals.signaled('ending-6');
        await worker.stop();
        output.push('worker stopped');
      }),
  ]);

  expect(output).toEqual([
    'finished enqueueing jobs pre worker.start',
    'finished enqueueing jobs post worker.start',
    'namespace1 1, .',
    'namespace2 2, .|.',
    'namespace1 3, .|.|.',
    'namespace1 4, .|.|.|.',
    'namespace2 5, .|.|.|.|.',
    'namespace1 6, .|.|.|.|.|.',
    'worker stopped',
  ]);
}, 10000);

it('should finish the in-progress job before stopping', async () => {
  const output: string[] = [];
  const adapter = DefaultTestingQueueAdapter();
  const dispatcher1 = new NamespacedDispatcher('namespace1', 'name', adapter);
  const dispatcher2 = new NamespacedDispatcher('namespace2', 'name', adapter);

  const worker = new QueueWorker('name', adapter, () => {});

  const signals = createSignals();

  const buildLogger = (namespace: string) => (message: string) => {
    output.push(`${namespace} ${message}`);
  };

  worker.register(TestJob, async namespace => new TestJob(signals.signal, buildLogger(namespace)));

  const dispatch = async (params: any, i: number) => {
    await sleep(5);
    return (i % 2 ? dispatcher2 : dispatcher1).dispatch(TestJob, params);
  };

  await dispatch({ data: { pieceOfData: ['.'] }, aNumber: 1 }, 0);
  await dispatch({ data: { pieceOfData: ['.', '.'] }, aNumber: 2 }, 1);
  await dispatch({ data: { pieceOfData: ['.', '.', '.'] }, aNumber: 3 }, 2);

  output.push('finished enqueueing jobs pre worker.start');

  await Promise.all([
    worker.start(),
    dispatch({ data: { pieceOfData: ['.', '.', '.', '.'] }, aNumber: 4 }, 0)
      .then(
        void dispatch({ data: { pieceOfData: ['.', '.', '.', '.', '.'] }, aNumber: 5 }, 1).then(
          void dispatch({ data: { pieceOfData: ['.', '.', '.', '.', '.', '.'] }, aNumber: 6 }, 2)
        )
      )
      .then(async () => {
        output.push('finished enqueueing jobs post worker.start');
        await signals.signaled('starting-4');
        output.push('stopping worker');
        await worker.stop();
        output.push('worker stopped');
      }),
  ]);

  expect(output).toEqual([
    'finished enqueueing jobs pre worker.start',
    'finished enqueueing jobs post worker.start',
    'namespace1 1, .',
    'namespace2 2, .|.',
    'namespace1 3, .|.|.',
    'stopping worker',
    'namespace1 4, .|.|.|.',
    'worker stopped',
  ]);
}, 10000);

it('should log and continue if a job fails', async () => {
  class FailOnceJob implements Dispatchable {
    static failed = false;

    // eslint-disable-next-line class-methods-use-this
    async handleDispatch(): Promise<void> {
      if (FailOnceJob.failed) {
        return;
      }

      FailOnceJob.failed = true;
      throw new Error('failing');
    }
  }

  const logMock = jest.fn();

  const adapter = DefaultTestingQueueAdapter();
  const dispatcher = new NamespacedDispatcher('namespace', 'name', adapter);
  const queueWorker = new QueueWorker('name', adapter, logMock);

  queueWorker.register(FailOnceJob, async () => new FailOnceJob());

  await dispatcher.dispatch(FailOnceJob, undefined);

  await Promise.all([queueWorker.start(), sleep(200).then(async () => queueWorker.stop())]);

  expect(logMock).toHaveBeenCalledWith(
    'error',
    expect.objectContaining({ job: expect.objectContaining({ name: FailOnceJob.name }) })
  );
  expect(logMock).toHaveBeenCalledWith(
    'info',
    expect.objectContaining({ message: expect.stringContaining('Sleeping') })
  );
});
