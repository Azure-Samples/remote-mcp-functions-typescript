/**
 * PostgreSQL storage for work-item drafts and the Q&A log.
 *
 * Connection settings come from app settings / local.settings.json:
 *   POSTGRES_HOST      fully qualified server name, e.g. psql-xyz.postgres.database.azure.com
 *   POSTGRES_DATABASE  database name (default: workitems)
 *   POSTGRES_USER      role to connect as. With Entra auth this is the managed
 *                      identity's name (in Azure) or your own UPN (locally).
 *   POSTGRES_PASSWORD  optional. When set, plain password auth is used
 *                      (e.g. a local docker postgres). When absent an Entra ID
 *                      access token is fetched with DefaultAzureCredential, which
 *                      resolves to the user-assigned managed identity in Azure
 *                      (via AZURE_CLIENT_ID) and to `az login` locally.
 *   POSTGRES_SSL       "false" to disable TLS for local servers (default: on)
 */
import { DefaultAzureCredential } from '@azure/identity';
import { Pool, PoolClient, types } from 'pg';

// pg returns int8 (BIGINT, e.g. COUNT(*)) as strings by default; our values fit in a JS number.
types.setTypeParser(types.builtins.INT8, (v) => Number(v));

export interface WorkItem {
    id: number;
    name: string;
    draft_version: number;
    content: string;
    update_from_previous_version: string | null;
    gitlab_workitem_id: string | null;
    gitlab_workitem_url: string | null;
    created_at: string;
}

export interface QaEntry {
    id: number;
    question: string;
    answer: string;
    gitlab_workitem_id: string | null;
    gitlab_workitem_url: string | null;
    created_at: string;
}

// Scope for Azure Database for PostgreSQL Entra ID authentication.
const POSTGRES_TOKEN_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

let credential: DefaultAzureCredential | undefined;

async function entraToken(): Promise<string> {
    credential ??= new DefaultAzureCredential();
    const token = await credential.getToken(POSTGRES_TOKEN_SCOPE);
    if (!token) throw new Error('Could not acquire an Entra ID token for PostgreSQL');
    return token.token;
}

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required setting ${name}`);
    return value;
}

let pool: Pool | undefined;

function getPool(): Pool {
    if (pool) return pool;
    const password = process.env.POSTGRES_PASSWORD;
    pool = new Pool({
        host: required('POSTGRES_HOST'),
        port: Number(process.env.POSTGRES_PORT ?? 5432),
        database: process.env.POSTGRES_DATABASE ?? 'workitems',
        user: required('POSTGRES_USER'),
        // pg accepts an async password provider, so every new connection gets a fresh token.
        password: password ? password : entraToken,
        ssl: process.env.POSTGRES_SSL === 'false' ? false : { rejectUnauthorized: true },
        max: 5,
        idleTimeoutMillis: 30_000,
    });
    return pool;
}

const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS workitems (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL,
        draft_version INTEGER NOT NULL,
        content TEXT NOT NULL,
        update_from_previous_version TEXT,
        gitlab_workitem_id TEXT,
        gitlab_workitem_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (name, draft_version)
    );
    CREATE INDEX IF NOT EXISTS idx_workitems_name ON workitems (name);
    CREATE TABLE IF NOT EXISTS qa_log (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        gitlab_workitem_id TEXT,
        gitlab_workitem_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_qa_log_gitlab_id ON qa_log (gitlab_workitem_id);
    ALTER TABLE workitems ADD COLUMN IF NOT EXISTS gitlab_workitem_id TEXT;
    ALTER TABLE workitems ADD COLUMN IF NOT EXISTS gitlab_workitem_url TEXT;
`;

let schemaReady: Promise<void> | undefined;

/** Create tables on first use. Retried on the next call if it fails. */
function ensureSchema(): Promise<void> {
    schemaReady ??= getPool()
        .query(SCHEMA_SQL)
        .then(() => undefined)
        .catch((err) => {
            schemaReady = undefined;
            throw err;
        });
    return schemaReady;
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    await ensureSchema();
    const result = await getPool().query(sql, params);
    return result.rows as T[];
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    await ensureSchema();
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    } finally {
        client.release();
    }
}

/** Latest draft of one work item, or undefined if the name is unknown. */
export async function latest(name: string): Promise<WorkItem | undefined> {
    const rows = await query<WorkItem>(
        `SELECT * FROM workitems WHERE name = $1 ORDER BY draft_version DESC LIMIT 1`,
        [name]
    );
    return rows[0];
}

/** Append a new draft, auto-incrementing draft_version within the name. */
export async function addDraft(
    name: string,
    content: string,
    updateFromPreviousVersion?: string,
    gitlabWorkitemId?: string,
    gitlabWorkitemUrl?: string
): Promise<WorkItem> {
    return withTransaction(async (client) => {
        // Serialise concurrent appends for the same name so versions never collide.
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [name]);
        const prev = (
            await client.query<WorkItem>(
                `SELECT * FROM workitems WHERE name = $1 ORDER BY draft_version DESC LIMIT 1`,
                [name]
            )
        ).rows[0];
        const next = (prev?.draft_version ?? 0) + 1;
        // GitLab link identifies the work item across drafts, so carry it over when omitted.
        const inserted = await client.query<WorkItem>(
            `INSERT INTO workitems (name, draft_version, content, update_from_previous_version, gitlab_workitem_id, gitlab_workitem_url)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                name,
                next,
                content,
                updateFromPreviousVersion ?? null,
                gitlabWorkitemId ?? prev?.gitlab_workitem_id ?? null,
                gitlabWorkitemUrl ?? prev?.gitlab_workitem_url ?? null,
            ]
        );
        return inserted.rows[0];
    });
}

/** One specific draft, or the latest when version is omitted. */
export async function getDraft(name: string, version?: number): Promise<WorkItem | undefined> {
    if (version === undefined) return latest(name);
    const rows = await query<WorkItem>(
        `SELECT * FROM workitems WHERE name = $1 AND draft_version = $2`,
        [name, version]
    );
    return rows[0];
}

/** Every draft of one work item, oldest first. */
export function listVersions(name: string): Promise<WorkItem[]> {
    return query<WorkItem>(`SELECT * FROM workitems WHERE name = $1 ORDER BY draft_version`, [name]);
}

/** Latest draft of every work item, plus its total draft count. */
export function listItems(): Promise<Array<WorkItem & { total_versions: number }>> {
    return query(
        `SELECT w.*, c.total_versions::int AS total_versions FROM workitems w
         JOIN (
             SELECT name, MAX(draft_version) AS v, COUNT(*) AS total_versions
             FROM workitems GROUP BY name
         ) c ON c.name = w.name AND c.v = w.draft_version
         ORDER BY w.name`
    );
}

/** Case-insensitive substring search over name, content and the change note. */
export function searchItems(q: string, limit = 20): Promise<WorkItem[]> {
    const like = `%${q}%`;
    return query<WorkItem>(
        `SELECT * FROM workitems
         WHERE name ILIKE $1 OR content ILIKE $1 OR update_from_previous_version ILIKE $1
         ORDER BY name, draft_version DESC LIMIT $2`,
        [like, limit]
    );
}

export interface DraftFields {
    content?: string;
    update_from_previous_version?: string;
    gitlab_workitem_id?: string | null;
    gitlab_workitem_url?: string | null;
}

/** Edit an existing draft in place. Returns the updated row, or undefined. */
export async function updateDraft(
    name: string,
    version: number,
    fields: DraftFields
): Promise<WorkItem | undefined> {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of [
        'content',
        'update_from_previous_version',
        'gitlab_workitem_id',
        'gitlab_workitem_url',
    ] as const) {
        if (fields[key] !== undefined) {
            values.push(fields[key] ?? null);
            sets.push(`${key} = $${values.length}`);
        }
    }
    if (sets.length === 0) return getDraft(name, version);
    values.push(name, version);
    const rows = await query<WorkItem>(
        `UPDATE workitems SET ${sets.join(', ')}
         WHERE name = $${values.length - 1} AND draft_version = $${values.length} RETURNING *`,
        values
    );
    return rows[0];
}

/** Delete one draft, or all drafts of a name. Returns rows removed. */
export async function deleteDraft(name: string, version?: number): Promise<number> {
    await ensureSchema();
    const result =
        version === undefined
            ? await getPool().query(`DELETE FROM workitems WHERE name = $1`, [name])
            : await getPool().query(`DELETE FROM workitems WHERE name = $1 AND draft_version = $2`, [
                  name,
                  version,
              ]);
    return result.rowCount ?? 0;
}

/** Record one Claude question/answer exchange. GitLab link fields are optional. */
export async function addQa(
    question: string,
    answer: string,
    gitlabWorkitemId?: string,
    gitlabWorkitemUrl?: string
): Promise<QaEntry> {
    const rows = await query<QaEntry>(
        `INSERT INTO qa_log (question, answer, gitlab_workitem_id, gitlab_workitem_url)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [question, answer, gitlabWorkitemId ?? null, gitlabWorkitemUrl ?? null]
    );
    return rows[0];
}

/** One Q&A entry by id, or undefined. */
export async function getQa(id: number): Promise<QaEntry | undefined> {
    const rows = await query<QaEntry>(`SELECT * FROM qa_log WHERE id = $1`, [id]);
    return rows[0];
}

/** Q&A entries, newest first. Optionally filter by GitLab work item id. */
export function listQa(gitlabWorkitemId?: string, limit = 50): Promise<QaEntry[]> {
    if (gitlabWorkitemId !== undefined) {
        return query<QaEntry>(
            `SELECT * FROM qa_log WHERE gitlab_workitem_id = $1 ORDER BY id DESC LIMIT $2`,
            [gitlabWorkitemId, limit]
        );
    }
    return query<QaEntry>(`SELECT * FROM qa_log ORDER BY id DESC LIMIT $1`, [limit]);
}

/** Case-insensitive substring search over questions and answers. */
export function searchQa(q: string, limit = 20): Promise<QaEntry[]> {
    const like = `%${q}%`;
    return query<QaEntry>(
        `SELECT * FROM qa_log WHERE question ILIKE $1 OR answer ILIKE $1 ORDER BY id DESC LIMIT $2`,
        [like, limit]
    );
}

export interface QaFields {
    question?: string;
    answer?: string;
    gitlab_workitem_id?: string | null;
    gitlab_workitem_url?: string | null;
}

/** Edit a Q&A entry, e.g. to attach the GitLab work item after creation. */
export async function updateQa(id: number, fields: QaFields): Promise<QaEntry | undefined> {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of ['question', 'answer', 'gitlab_workitem_id', 'gitlab_workitem_url'] as const) {
        if (fields[key] !== undefined) {
            values.push(fields[key] ?? null);
            sets.push(`${key} = $${values.length}`);
        }
    }
    if (sets.length === 0) return getQa(id);
    values.push(id);
    const rows = await query<QaEntry>(
        `UPDATE qa_log SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
    );
    return rows[0];
}

/** Delete one Q&A entry. Returns rows removed. */
export async function deleteQa(id: number): Promise<number> {
    await ensureSchema();
    const result = await getPool().query(`DELETE FROM qa_log WHERE id = $1`, [id]);
    return result.rowCount ?? 0;
}
