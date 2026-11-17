import mongoose, { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../src/db.js';
import { logger } from '../src/lib/logger.js';
import { Note, Post, User } from '../src/models/index.js';

type PlanNode = {
  stage?: string;
  indexName?: string;
  inputStage?: PlanNode;
  inputStages?: PlanNode[];
  shards?: Array<{ winningPlan?: PlanNode }>;
  queryPlanner?: { winningPlan?: PlanNode };
  stages?: Array<{ $cursor?: { queryPlanner?: { winningPlan?: PlanNode } }; [k: string]: unknown }>;
};

type ExplainRow = {
  name: string;
  ok: boolean;
  stages: string[];
  indexes: string[];
  note?: string;
};

const EXPECTED_INDEXES: Record<string, Array<{ name: string; key: Record<string, number>; unique?: boolean }>> = {
  users: [
    { name: '_id_', key: { _id: 1 } },
    { name: 'email_1', key: { email: 1 }, unique: true },
    { name: 'interests_1', key: { interests: 1 } },
  ],
  notes: [
    { name: '_id_', key: { _id: 1 } },
    { name: 'owner_1__id_-1', key: { owner: 1, _id: -1 } },
  ],
  posts: [
    { name: '_id_', key: { _id: 1 } },
    { name: 'author_1__id_-1', key: { author: 1, _id: -1 } },
  ],
};

function walkPlan(node: PlanNode | undefined, stages: string[], indexes: string[]) {
  if (!node) return;

  if (node.stage) {
    stages.push(node.stage);
    if (node.indexName) indexes.push(node.indexName);
  }

  if (node.inputStage) walkPlan(node.inputStage, stages, indexes);
  if (node.inputStages) {
    for (const child of node.inputStages) walkPlan(child, stages, indexes);
  }
  if (node.shards) {
    for (const shard of node.shards) walkPlan(shard.winningPlan, stages, indexes);
  }
  if (node.queryPlanner?.winningPlan) {
    walkPlan(node.queryPlanner.winningPlan, stages, indexes);
  }
  if (node.stages) {
    for (const stage of node.stages) {
      const cursorPlan = stage.$cursor?.queryPlanner?.winningPlan;
      if (cursorPlan) walkPlan(cursorPlan, stages, indexes);
      for (const [key, value] of Object.entries(stage)) {
        if (key === '$cursor') continue;
        if (value && typeof value === 'object') {
          walkPlan(value as PlanNode, stages, indexes);
        }
      }
    }
  }
}

function summarizeExplain(raw: unknown): { stages: string[]; indexes: string[]; hasCollScan: boolean } {
  const stages: string[] = [];
  const indexes: string[] = [];
  walkPlan(raw as PlanNode, stages, indexes);
  const uniqueStages = [...new Set(stages)];
  const uniqueIndexes = [...new Set(indexes)];
  return {
    stages: uniqueStages,
    indexes: uniqueIndexes,
    hasCollScan: uniqueStages.includes('COLLSCAN'),
  };
}

async function explainFind(
  name: string,
  collection: mongoose.Collection,
  filter: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<ExplainRow> {
  const raw = await collection.find(filter, options).explain('executionStats');
  const summary = summarizeExplain(raw);
  return {
    name,
    ok: !summary.hasCollScan,
    stages: summary.stages,
    indexes: summary.indexes,
  };
}

async function explainAggregate(
  name: string,
  collection: mongoose.Collection,
  pipeline: object[],
): Promise<ExplainRow> {
  const raw = await collection.aggregate(pipeline).explain('executionStats');
  const summary = summarizeExplain(raw);
  return {
    name,
    ok: !summary.hasCollScan,
    stages: summary.stages,
    indexes: summary.indexes,
  };
}

async function ensureSampleData() {
  await Promise.all([User.deleteMany({}), Note.deleteMany({}), Post.deleteMany({})]);

  const [alice, bob, admin] = await User.create([
    {
      name: 'Alice',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'user',
      interests: ['chess', 'reading'],
    },
    {
      name: 'Bob',
      email: 'bob@example.com',
      passwordHash: 'hash',
      role: 'user',
      interests: ['reading'],
    },
    {
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: 'admin',
      interests: [],
    },
  ]);

  await Note.create([
    { title: 'A1', content: 'x', owner: alice!._id },
    { title: 'B1', content: 'y', owner: bob!._id },
  ]);
  await Post.create([
    { title: 'P1', body: 'body', author: alice!._id },
    { title: 'P2', body: 'body', author: alice!._id },
  ]);

  return { alice: alice!, bob: bob!, admin: admin! };
}

async function verifyIndexes(): Promise<{ ok: boolean; details: string[] }> {
  const details: string[] = [];
  let ok = true;

  for (const [collectionName, expected] of Object.entries(EXPECTED_INDEXES)) {
    const actual = await mongoose.connection.db!.collection(collectionName).indexes();
    const actualNames = actual.map((i) => i.name).sort();
    const expectedNames = expected.map((i) => i.name).sort();
    if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
      ok = false;
      details.push(
        `${collectionName}: expected [${expectedNames.join(', ')}] got [${actualNames.join(', ')}]`,
      );
    } else {
      details.push(`${collectionName}: ok (${actualNames.join(', ')})`);
    }
  }

  return { ok, details };
}

export async function runExplain(options: { silent?: boolean } = {}): Promise<{
  ok: boolean;
  rows: ExplainRow[];
  indexDetails: string[];
  allowedExceptions: string[];
}> {
  await Promise.all([User.syncIndexes(), Note.syncIndexes(), Post.syncIndexes()]);
  const { alice, bob } = await ensureSampleData();

  const users = User.collection;
  const notes = Note.collection;
  const posts = Post.collection;

  const rows: ExplainRow[] = [];

  rows.push(
    await explainFind('auth login findOne({ email })', users, { email: alice.email }),
  );
  rows.push(await explainFind('authenticate findById', users, { _id: alice._id }));
  rows.push(
    await explainFind(
      'notes list mine',
      notes,
      { owner: alice._id },
      { sort: { _id: -1 }, limit: 20 },
    ),
  );
  rows.push(await explainFind('notes count mine', notes, { owner: alice._id }));
  rows.push(
    await explainFind('notes read one owner-scoped', notes, {
      _id: new Types.ObjectId(),
      owner: alice._id,
    }),
  );
  rows.push(
    await explainFind(
      'admin notes by owner',
      notes,
      { owner: bob._id },
      { sort: { _id: -1 }, limit: 20 },
    ),
  );
  rows.push(
    await explainFind('admin notes all sort _id', notes, {}, { sort: { _id: -1 }, limit: 20 }),
  );
  rows.push(
    await explainFind('admin users list sort _id', users, {}, { sort: { _id: -1 }, limit: 20 }),
  );
  rows.push(await explainFind('posts delete author-scoped', posts, { _id: new Types.ObjectId(), author: alice._id }));

  rows.push(
    await explainAggregate('GET /users/:id/posts $lookup', users, [
      { $match: { _id: alice._id } },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          as: 'result',
          pipeline: [
            { $sort: { _id: -1 } },
            {
              $facet: {
                data: [{ $skip: 0 }, { $limit: 20 }],
                total: [{ $count: 'n' }],
              },
            },
          ],
        },
      },
      { $project: { name: 1, interests: 1, result: { $first: '$result' } } },
    ]),
  );

  rows.push(
    await explainAggregate('GET /users/by-interest', users, [
      { $match: { interests: { $gt: '' } } },
      { $project: { name: 1, email: 1, interests: 1 } },
      { $unwind: '$interests' },
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: 0 }, { $limit: 20 }],
          total: [{ $count: 'n' }],
        },
      },
    ]),
  );

  rows.push(
    await explainAggregate('GET /users/by-interest?interest=', users, [
      { $match: { interests: 'chess' } },
      { $project: { name: 1, email: 1, interests: 1 } },
      { $unwind: '$interests' },
      { $match: { interests: 'chess' } },
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
    ]),
  );

  const allowedExceptions = [
    'estimatedDocumentCount() — collection metadata, no document scan (admin lists)',
    'countDocuments({ role: "admin" }) — last-admin guard only; no role index by design (decision 23)',
  ];

  const indexCheck = await verifyIndexes();
  const queriesOk = rows.every((row) => row.ok);
  const ok = queriesOk && indexCheck.ok;

  if (!options.silent) {
    console.log('\nQuery explain summary');
    console.log('---------------------');
    for (const row of rows) {
      const mark = row.ok ? 'OK' : 'COLLSCAN';
      console.log(
        `[${mark}] ${row.name}\n  stages: ${row.stages.join(' > ') || '(none)'}\n  indexes: ${row.indexes.join(', ') || '(none)'}`,
      );
    }
    console.log('\nAllowed exceptions (not explained as indexed finds):');
    for (const item of allowedExceptions) console.log(`  - ${item}`);
    console.log('\nIndex inventory');
    for (const line of indexCheck.details) console.log(`  - ${line}`);
    console.log(ok ? '\nexplain: PASS' : '\nexplain: FAIL');
  }

  return { ok, rows, indexDetails: indexCheck.details, allowedExceptions };
}

async function main() {
  await connectDb();
  const result = await runExplain();
  await disconnectDb();
  process.exit(result.ok ? 0 : 1);
}

const isDirect = process.argv[1]?.includes('explain');
if (isDirect) {
  main().catch(async (err) => {
    logger.fatal({ err }, 'explain failed');
    await disconnectDb().catch(() => undefined);
    process.exit(1);
  });
}
