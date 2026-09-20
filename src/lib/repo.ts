import type { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";

export type Project = {
  id: number;
  user_id: number;
  name: string;
  public_key: string;
  accent: string;
  origins: string;
  created_at: number;
};
export type Feedback = {
  id: number;
  project_id: number;
  kind: string;
  message: string;
  email: string;
  page_url: string;
  status: string;
  created_at: number;
};
export type RoadmapItem = {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: string;
  visible: number;
  votes: number;
  created_at: number;
};

export class ConflictError extends Error {}

// ---- users & sessions -------------------------------------------------------------------------

export function createUser(
  db: DatabaseSync,
  email: string,
  pwHash: string,
  now = Date.now(),
): number {
  try {
    const r = db
      .prepare("INSERT INTO users (email, pw_hash, created_at) VALUES (?, ?, ?)")
      .run(email, pwHash, now);
    return Number(r.lastInsertRowid);
  } catch (e) {
    if (e instanceof Error && e.message.includes("users.email")) throw new ConflictError("email");
    throw e;
  }
}

export const getUserByEmail = (db: DatabaseSync, email: string) =>
  db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    { id: number; email: string; pw_hash: string; plan: string } | undefined;

export function createSession(
  db: DatabaseSync,
  userId: number,
  tokenHash: string,
  expiresAt: number,
) {
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    tokenHash,
    userId,
    expiresAt,
  );
}

export function getSessionUser(db: DatabaseSync, tokenHash: string, now = Date.now()) {
  return db
    .prepare(
      `SELECT u.id, u.email, u.plan FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(tokenHash, now) as { id: number; email: string; plan: string } | undefined;
}

export const deleteSession = (db: DatabaseSync, tokenHash: string) =>
  void db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);

// ---- projects ---------------------------------------------------------------------------------

export const newPublicKey = () => `pk_${randomBytes(12).toString("base64url")}`;

export function createProject(db: DatabaseSync, userId: number, name: string, now = Date.now()) {
  const key = newPublicKey();
  const r = db
    .prepare("INSERT INTO projects (user_id, name, public_key, created_at) VALUES (?, ?, ?, ?)")
    .run(userId, name, key, now);
  return { id: Number(r.lastInsertRowid), publicKey: key };
}

export const listProjects = (db: DatabaseSync, userId: number) =>
  db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY id").all(userId) as Project[];

/** Ownership check lives in the query: `AND user_id = ?` (prevents IDOR). */
export const getOwnedProject = (db: DatabaseSync, userId: number, id: number) =>
  db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId) as
    Project | undefined;

export const getProjectByKey = (db: DatabaseSync, key: string) =>
  db.prepare("SELECT * FROM projects WHERE public_key = ?").get(key) as Project | undefined;

export function updateProject(
  db: DatabaseSync,
  userId: number,
  id: number,
  p: { name: string; accent: string; origins: string },
): boolean {
  return (
    Number(
      db
        .prepare(
          "UPDATE projects SET name = ?, accent = ?, origins = ? WHERE id = ? AND user_id = ?",
        )
        .run(p.name, p.accent, p.origins, id, userId).changes,
    ) > 0
  );
}

// ---- feedback ---------------------------------------------------------------------------------

export function addFeedback(
  db: DatabaseSync,
  projectId: number,
  f: { kind: string; message: string; email: string; pageUrl: string },
  now = Date.now(),
): number {
  const r = db
    .prepare(
      "INSERT INTO feedback (project_id, kind, message, email, page_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(projectId, f.kind, f.message, f.email, f.pageUrl, now);
  return Number(r.lastInsertRowid);
}

export const listFeedback = (db: DatabaseSync, projectId: number, includeArchived = false) =>
  db
    .prepare(
      `SELECT * FROM feedback WHERE project_id = ? ${includeArchived ? "" : "AND status != 'archived'"}
       ORDER BY created_at DESC, id DESC LIMIT 200`,
    )
    .all(projectId) as Feedback[];

export const setFeedbackStatus = (
  db: DatabaseSync,
  projectId: number,
  id: number,
  status: string,
) =>
  Number(
    db
      .prepare("UPDATE feedback SET status = ? WHERE id = ? AND project_id = ?")
      .run(status, id, projectId).changes,
  ) > 0;

/** Turns a feedback message into a roadmap item and marks the feedback as read. */
export function promoteFeedback(db: DatabaseSync, projectId: number, id: number, now = Date.now()) {
  const f = db
    .prepare("SELECT * FROM feedback WHERE id = ? AND project_id = ?")
    .get(id, projectId) as Feedback | undefined;
  if (!f) return undefined;
  const title = f.message.split("\n")[0].slice(0, 120);
  const itemId = addRoadmapItem(
    db,
    projectId,
    { title, description: f.message.slice(0, 500), status: "planned", visible: true },
    now,
  );
  setFeedbackStatus(db, projectId, id, "read");
  return itemId;
}

// ---- roadmap & votes --------------------------------------------------------------------------

export function addRoadmapItem(
  db: DatabaseSync,
  projectId: number,
  i: { title: string; description: string; status: string; visible: boolean },
  now = Date.now(),
): number {
  const r = db
    .prepare(
      "INSERT INTO roadmap_items (project_id, title, description, status, visible, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(projectId, i.title, i.description, i.status, i.visible ? 1 : 0, now);
  return Number(r.lastInsertRowid);
}

export function updateRoadmapItem(
  db: DatabaseSync,
  projectId: number,
  id: number,
  i: { title: string; description: string; status: string; visible: boolean },
): boolean {
  return (
    Number(
      db
        .prepare(
          "UPDATE roadmap_items SET title = ?, description = ?, status = ?, visible = ? WHERE id = ? AND project_id = ?",
        )
        .run(i.title, i.description, i.status, i.visible ? 1 : 0, id, projectId).changes,
    ) > 0
  );
}

export const deleteRoadmapItem = (db: DatabaseSync, projectId: number, id: number) =>
  Number(
    db.prepare("DELETE FROM roadmap_items WHERE id = ? AND project_id = ?").run(id, projectId)
      .changes,
  ) > 0;

export const listRoadmap = (db: DatabaseSync, projectId: number, publicOnly: boolean) =>
  db
    .prepare(
      `SELECT * FROM roadmap_items WHERE project_id = ? ${publicOnly ? "AND visible = 1" : ""}
       ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, votes DESC, id`,
    )
    .all(projectId) as RoadmapItem[];

export function votedItemIds(db: DatabaseSync, projectId: number, voter: string): Set<number> {
  const rows = db
    .prepare(
      `SELECT v.item_id FROM votes v JOIN roadmap_items i ON i.id = v.item_id
       WHERE i.project_id = ? AND v.voter_id = ?`,
    )
    .all(projectId, voter) as { item_id: number }[];
  return new Set(rows.map((r) => r.item_id));
}

/** Toggles a vote. The item must belong to the project AND be visible, so private items cannot be probed. */
export function toggleVote(
  db: DatabaseSync,
  projectId: number,
  itemId: number,
  voter: string,
): { voted: boolean; votes: number } | undefined {
  const item = db
    .prepare("SELECT id FROM roadmap_items WHERE id = ? AND project_id = ? AND visible = 1")
    .get(itemId, projectId);
  if (!item) return undefined;
  db.exec("BEGIN");
  try {
    const removed = db
      .prepare("DELETE FROM votes WHERE item_id = ? AND voter_id = ?")
      .run(itemId, voter);
    let voted: boolean;
    if (Number(removed.changes) > 0) {
      db.prepare("UPDATE roadmap_items SET votes = votes - 1 WHERE id = ?").run(itemId);
      voted = false;
    } else {
      db.prepare("INSERT INTO votes (item_id, voter_id) VALUES (?, ?)").run(itemId, voter);
      db.prepare("UPDATE roadmap_items SET votes = votes + 1 WHERE id = ?").run(itemId);
      voted = true;
    }
    const row = db.prepare("SELECT votes FROM roadmap_items WHERE id = ?").get(itemId) as {
      votes: number;
    };
    db.exec("COMMIT");
    return { voted, votes: Number(row.votes) };
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
