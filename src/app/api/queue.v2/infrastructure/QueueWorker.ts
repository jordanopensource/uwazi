/* eslint-disable no-await-in-loop */
import { performance } from 'perf_hooks';
import { Dispatchable } from '../application/contracts/Dispatchable';
import { DispatchableClass } from '../application/contracts/JobsDispatcher';
import { UnregisteredJobError } from './errors';
import { Job, QueueAdapter } from './QueueAdapter';
import { inspect } from 'util';

interface WorkerOptions {
  waitTime?: number;
}

const optionsDefaults: Required<WorkerOptions> = {
  waitTime: 1000,
};

const defaultPerformance = {
  count: 0,
  processingTime: 0,
  batchStart: 0,
};

interface Registry {
  [name: string]: (namespace: string) => Promise<Dispatchable>;
}
export class QueueWorker {
  private queueName: string;

  private adapter: QueueAdapter;

  private logger: (level: 'info' | 'error', message: string | object) => void;

  private options: Required<WorkerOptions>;

  private stoppedCallback?: Function;

  private registry: Registry = {};

  private timesSlept = 0;

  private performance = {
    ...defaultPerformance,
  };

  constructor(
    queueName: string,
    adapter: QueueAdapter,
    logger: (level: 'info' | 'error', message: string | object) => void
  ) {
    this.queueName = queueName;
    this.adapter = adapter;
    this.options = { ...optionsDefaults };
    this.logger = logger;
  }

  private logAndResetMetrics() {
    this.logger('info', {
      message: 'Performance metrics',
      processingTime: this.performance.processingTime,
      count: this.performance.count,
      totalTime: performance.now() - this.performance.batchStart,
    });
    this.performance = { ...defaultPerformance };
  }

  private logProcess(start: number) {
    this.performance.processingTime += performance.now() - start;
    this.performance.count += 1;
  }

  private async sleep() {
    if (this.timesSlept === 0) {
      this.logAndResetMetrics();
      this.logger('info', { message: 'Sleeping', waitTime: this.options.waitTime });
    }

    this.timesSlept += 1;
    return new Promise(resolve => {
      setTimeout(resolve, this.options.waitTime);
    });
  }

  private async peekJob() {
    let job = await this.adapter.pickJob(this.queueName);

    while (!this.isStopping() && !job) {
      await this.sleep();
      job = await this.adapter.pickJob(this.queueName);
    }

    if (this.isStopping()) return null;

    if (this.timesSlept) {
      this.logger('info', { message: 'Resumed', timesSlept: this.timesSlept });
      this.timesSlept = 0;
    }

    return job;
  }

  private async createDispatchable(job: Job) {
    if (!this.registry[job.name]) {
      throw new UnregisteredJobError(job.name);
    }

    return this.registry[job.name](job.namespace);
  }

  private async completeJob(job: Job) {
    return this.adapter.deleteJob(job);
  }

  private async processJob(job: Job) {
    const start = performance.now();
    const dispatchable = await this.createDispatchable(job);
    const heartbeatCallback = async () => this.adapter.renewJobLock(job);

    try {
      this.logger('info', { message: 'Processing job', ...job });
      await dispatchable.handleDispatch(heartbeatCallback, job.params);
      this.logger('info', { message: 'Processed job', ...job });
      await this.completeJob(job);
    } catch (e) {
      this.logger('error', {
        message: inspect(e),
        job,
      });
    } finally {
      this.logProcess(start);
    }
  }

  async start() {
    this.performance.batchStart = performance.now();
    let job = await this.peekJob();
    while (job) {
      await this.processJob(job);
      job = await this.peekJob();
    }
    this.stopped();
  }

  private isStopping() {
    return !!this.stoppedCallback;
  }

  private stopped() {
    if (this.stoppedCallback) this.stoppedCallback();
  }

  async stop() {
    return new Promise<void>(resolve => {
      this.stoppedCallback = resolve;
    });
  }

  register<T extends Dispatchable>(
    dispatchable: DispatchableClass<T>,
    factory: (namespace: string) => Promise<T>
  ) {
    this.registry[dispatchable.name] = factory;
  }

  getRegisteredJobs() {
    return Object.keys(this.registry);
  }
}
