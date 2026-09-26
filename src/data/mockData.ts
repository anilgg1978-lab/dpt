export const DESKTOP_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1W2dT1P0elnXkvoAnZY4EpXkFamaJvgbTIbOqgBiB_bkkplmAQI4EZsOwXC7g8IlS-bo0AS4W-tDFnufRo6spOV3SS-R_pL2tGQtD0hgvPktKdSagi5cNrHR6XHppKh_PLShIPriikOH7urAGMCtAjz3wAUwoxpZ9V3VRsLwCdsqlphRGNUeYpqxJRb5HwgOMjohwnurdexJUuIQ1JaVR6ILbvrJ6y8rfjaAcU2qbyRFqxuGaHCwWTSYHI';

export const MOBILE_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1XPZkssVNeF730NwFDTz3qygtEyeEA2VgJGeFkHe3jFIW-RuhMd1BhSdp9RnddpGV3sflyiCr8e-WT01duKCE-sRpXxSOy5wMUHHBJdgB15IRydpO6r6HqpwQ5X1zroAcWkw16tF7mPZjC-dIeSNavceXEqx-3ZuhIMwlKCde_GssVcYRxzIUgq7YcNKY2golvtUhmAIHfOLTmKxGp6sz3TbcAP7GS4ctXjo08XliHx_tGehsQ8K13R3WUX';

export interface ModelOption {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  topBadge: string;
  subtitle: string;
  description: string;
  category: 'reasoning' | 'fast' | 'swe' | 'general';
  icon: string;
  accentColor: 'primary' | 'tertiary' | 'secondary' | 'primary-fixed';
  tags: { label: string; highlighted?: boolean }[];
  metrics: {
    ttft: string;
    ttftIcon: string;
    speed: string;
    speedIcon: string;
    trait: string;
    traitIcon: string;
  };
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o Omnimodel',
    shortName: 'GPT-4o',
    badge: 'Active',
    topBadge: 'Fast',
    subtitle: 'General Multimodal Intelligence',
    description:
      'Flagship architecture for high-complexity prompts, multi-language code refactoring, vision inspection, and strategic reasoning.',
    category: 'general',
    icon: 'neurology',
    accentColor: 'primary',
    tags: [
      { label: '128k Context' },
      { label: 'Vision & Audio' },
      { label: 'Production Stable', highlighted: true },
    ],
    metrics: {
      ttft: '480ms TTFT',
      ttftIcon: 'speed',
      speed: '118 tokens/sec',
      speedIcon: 'bolt',
      trait: 'Broad Reasoning',
      traitIcon: 'psychology',
    },
  },
  {
    id: 'nexus-r1',
    name: 'Nexus-R1 Reasoning',
    shortName: 'Nexus-R1',
    badge: 'CoT Engine',
    topBadge: 'Deep CoT',
    subtitle: 'Formal Logic, Math & Deep Proofs',
    description:
      'Specialized deep reasoning model that outputs internal recursive thought streams for algorithmic proofs, formal verification, and distributed logic.',
    category: 'reasoning',
    icon: 'psychology_alt',
    accentColor: 'tertiary',
    tags: [
      { label: 'Step Verification' },
      { label: 'Extended Thinking' },
      { label: '64k Output Tokens', highlighted: true },
    ],
    metrics: {
      ttft: '1.2s TTFT',
      ttftIcon: 'hourglass_top',
      speed: 'Deep Branching',
      speedIcon: 'memory',
      trait: 'Full Trace',
      traitIcon: 'auto_stories',
    },
  },
  {
    id: 'nexus-mini',
    name: 'Nexus-4o Mini',
    shortName: '4o Mini',
    badge: 'Ultra Fast',
    topBadge: 'Turbo',
    subtitle: 'Low Latency Micro-Tasks',
    description:
      'Extremely nimble architecture tailored for swift iterative revisions, doc translation, structured JSON output, and chat orchestration.',
    category: 'fast',
    icon: 'rocket_launch',
    accentColor: 'secondary',
    tags: [
      { label: 'Sub-150ms' },
      { label: 'Economical' },
      { label: '128k Window', highlighted: true },
    ],
    metrics: {
      ttft: '140ms TTFT',
      ttftIcon: 'speed',
      speed: '240 tokens/sec',
      speedIcon: 'bolt',
      trait: '10x Cost Eff.',
      traitIcon: 'savings',
    },
  },
  {
    id: 'nexus-coder',
    name: 'Nexus Coder v2.5',
    shortName: 'Coder v2.5',
    badge: 'SWE 92.4%',
    topBadge: 'SWE',
    subtitle: 'Polyglot Architecture & Unit Tests',
    description:
      'Fine-tuned across 80+ programming frameworks. Integrates with full repository tree graphs, AST refactoring, and automated test runners.',
    category: 'swe',
    icon: 'terminal',
    accentColor: 'primary-fixed',
    tags: [
      { label: 'Repo Context' },
      { label: 'AST Patching' },
      { label: 'Git Aware' },
    ],
    metrics: {
      ttft: '390ms TTFT',
      ttftIcon: 'speed',
      speed: '145 tokens/sec',
      speedIcon: 'code',
      trait: 'Zero Hallucination',
      traitIcon: 'bug_report',
    },
  },
];

export interface ChatThreadItem {
  id: string;
  title: string;
  group: 'Today' | 'Previous 7 Days' | 'Previous 30 Days';
  breadcrumb: string;
  contextTokens: string;
  pinned?: boolean;
}

export const INITIAL_THREADS: ChatThreadItem[] = [
  {
    id: 'chat-workspace',
    title: 'React performance audit',
    group: 'Today',
    breadcrumb: 'project / architecture-review / v3.4',
    contextTokens: '2,410 tokens',
    pinned: true,
  },
  {
    id: 'tailwind-migration-audit',
    title: 'Tailwind v4 migration tips',
    group: 'Today',
    breadcrumb: 'project / design-system / tailwind-v4',
    contextTokens: '1,840 tokens',
  },
  {
    id: 'python-async-scraper',
    title: 'Python async scraper script',
    group: 'Previous 7 Days',
    breadcrumb: 'pipelines / ingestion / asyncio-worker',
    contextTokens: '3,120 tokens',
  },
  {
    id: 'pitch-deck-draft',
    title: 'Creative pitch deck draft',
    group: 'Previous 7 Days',
    breadcrumb: 'strategy / series-b / narrative-deck',
    contextTokens: '1,590 tokens',
  },
  {
    id: 'system-architecture',
    title: 'High throughput architecture',
    group: 'Previous 30 Days',
    breadcrumb: 'core / distributed-bus / kafka-raft',
    contextTokens: '4,820 tokens',
  },
];

export const WORKER_SERVICE_CODE = `import { Worker, Queue, Job } from 'bullmq';
import { RedisConnection } from './infrastructure/redis';

export interface TaskPayload {
  readonly taskId: string;
  readonly entityId: string;
  readonly attempts: number;
}

export class DistributedTaskProcessor {
  private worker: Worker<TaskPayload>;

  constructor(private readonly redis: RedisConnection) {
    this.worker = new Worker<TaskPayload>(
      'critical-tasks',
      async (job: Job<TaskPayload>) => this.handleJob(job),
      {
        connection: this.redis.getClient(),
        concurrency: 20,
        limiter: { max: 100, duration: 1000 },
      }
    );

    this.bindTelemetry();
  }

  private async handleJob(job: Job<TaskPayload>): Promise<void> {
    // Distributed Idempotency Lock
    const isAcquired = await this.redis.set(
      \`idempotency:\${job.data.taskId}\`,
      'LOCKED',
      'EX',
      3600,
      'NX'
    );

    if (!isAcquired) return; // Prevent redundant concurrent executions

    await this.processWithRetry(job.data);
  }
}`;

export interface FollowUpTurn {
  id: string;
  userTime: string;
  userPrompt: string;
  thoughtTime: string;
  thoughtPhases: { num: string; title: string; detail: string }[];
  intro: string;
  codeTitle: string;
  codeFile: string;
  codeContent: string;
  ttft: string;
  tokensPerSec: string;
  reasoningBudgetUsed: number;
}

export const SUGGESTION_RESPONSES: Record<string, Omit<FollowUpTurn, 'id' | 'userTime' | 'reasoningBudgetUsed'>> = {
  'Add Retry Circuit Breaker': {
    userPrompt: 'Can you add a half-open state retry circuit breaker around downstream database writes?',
    thoughtTime: '2.8s',
    thoughtPhases: [
      {
        num: '01',
        title: 'State machine transitions:',
        detail: 'Modeling CLOSED -> OPEN -> HALF_OPEN state transitions with sliding window failure counters.',
      },
      {
        num: '02',
        title: 'Consumer pause coordination:',
        detail: 'Triggering worker.pause() across cluster nodes when downstream saturation exceeds 90%.',
      },
    ],
    intro:
      'Below is a zero-allocation **Adaptive Circuit Breaker** that coordinates with BullMQ workers to pause consumption before cascading timeouts occur.',
    codeTitle: 'Adaptive Circuit Breaker Module',
    codeFile: 'circuit-breaker.ts',
    codeContent: `export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private nextAttemptAt = 0;

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 15_000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptAt) {
        throw new Error('CIRCUIT_OPEN: Downstream saturation protection active');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.cooldownMs;
    }
  }
}`,
    ttft: '410 ms',
    tokensPerSec: '132 tokens/sec',
  },
  'Generate Docker Compose': {
    userPrompt: 'Generate a production-ready Docker Compose stack with Redis 7 Cluster, worker replicas, and Prometheus metrics.',
    thoughtTime: '2.1s',
    thoughtPhases: [
      {
        num: '01',
        title: 'Persistence & AOF durability:',
        detail: 'Configuring Redis 7 with appendonly fsync everysec and noeviction policy for queue safety.',
      },
      {
        num: '02',
        title: 'Graceful SIGTERM draining:',
        detail: 'Setting stop_grace_period to 45s so active in-flight jobs finish before container teardown.',
      },
    ],
    intro:
      'Here is a multi-replica `docker-compose.yml` enforcing strict memory guarantees (`noeviction`) and graceful `SIGTERM` job draining.',
    codeTitle: 'Container Orchestration Topology',
    codeFile: 'docker-compose.yml',
    codeContent: `services:
  redis-broker:
    image: redis:7.2-alpine
    command: redis-server --appendonly yes --maxmemory-policy noeviction
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  task-worker:
    build:
      context: .
      target: production
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: "1.50"
          memory: 1024M
    stop_grace_period: 45s
    environment:
      REDIS_URL: redis://redis-broker:6379
      WORKER_CONCURRENCY: 20
    depends_on:
      redis-broker:
        condition: service_healthy`,
    ttft: '365 ms',
    tokensPerSec: '148 tokens/sec',
  },
  'Add Unit Tests': {
    userPrompt: 'Add deterministic Vitest unit tests verifying idempotency lock contention and exponential backoff retries.',
    thoughtTime: '2.5s',
    thoughtPhases: [
      {
        num: '01',
        title: 'Concurrent lock race simulation:',
        detail: 'Firing 10 parallel job handlers with identical taskId to assert single execution.',
      },
      {
        num: '02',
        title: 'Fake timer jitter verification:',
        detail: 'Checking deterministic retry delay boundaries under transient network faults.',
      },
    ],
    intro:
      'This test suite validates that concurrent workers racing on the same `taskId` execute the side-effect exactly once via the `NX` lock barrier.',
    codeTitle: 'Idempotency & Concurrency Test Suite',
    codeFile: 'worker-service.spec.ts',
    codeContent: `import { describe, it, expect, vi } from 'vitest';
import { DistributedTaskProcessor } from './worker-service';

describe('DistributedTaskProcessor Concurrency', () => {
  it('enforces strict single-execution under parallel race conditions', async () => {
    const acquiredLocks = new Set<string>();
    const mockRedis = {
      getClient: () => ({}),
      set: vi.fn(async (key: string) => {
        if (acquiredLocks.has(key)) return null;
        acquiredLocks.add(key);
        return 'OK';
      }),
    };

    const processor = new DistributedTaskProcessor(mockRedis as any);
    const spy = vi.spyOn(processor as any, 'processWithRetry').mockResolvedValue(undefined);

    const payload = { data: { taskId: 'tx_99481', entityId: 'org_1', attempts: 1 } };
    await Promise.all(Array.from({ length: 8 }, () => (processor as any).handleJob(payload)));

    expect(spy).toHaveBeenCalledTimes(1);
  });
});`,
    ttft: '395 ms',
    tokensPerSec: '126 tokens/sec',
  },
  'Benchmark Throughput': {
    userPrompt: 'Show me a benchmark harness and expected latency percentiles (p50, p95, p99) for 50k jobs/min.',
    thoughtTime: '3.0s',
    thoughtPhases: [
      {
        num: '01',
        title: 'Pipeline batching amortization:',
        detail: 'Comparing single EVALSHA roundtrips against pipelined Lua batching across 4 worker nodes.',
      },
      {
        num: '02',
        title: 'Tail latency profiling:',
        detail: 'Calculating p99 lock acquisition overhead under 20x concurrency saturation.',
      },
    ],
    intro:
      'Using pipelined Redis Lua scripts and 4 stateless worker replicas (`concurrency: 20`), the cluster sustains **54,200 jobs/min** with sub-4ms p99 lock overhead.',
    codeTitle: 'High-Throughput Load Generator',
    codeFile: 'benchmark-runner.ts',
    codeContent: `import { Queue } from 'bullmq';
import { performance } from 'node:perf_hooks';

export async function runThroughputBenchmark(queue: Queue, totalJobs = 50_000) {
  const batchSize = 1_000;
  const start = performance.now();

  for (let offset = 0; offset < totalJobs; offset += batchSize) {
    const jobs = Array.from({ length: batchSize }, (_, idx) => ({
      name: 'critical-tasks',
      data: {
        taskId: \`bench_\${offset + idx}\`,
        entityId: \`acct_\${(offset + idx) % 256}\`,
        attempts: 0,
      },
    }));
    await queue.addBulk(jobs);
  }

  const elapsedSec = (performance.now() - start) / 1000;
  return {
    totalJobs,
    elapsedSec: elapsedSec.toFixed(2),
    jobsPerSec: Math.round(totalJobs / elapsedSec),
    p50LatencyMs: 1.4,
    p99LatencyMs: 3.8,
  };
}`,
    ttft: '440 ms',
    tokensPerSec: '121 tokens/sec',
  },
};
