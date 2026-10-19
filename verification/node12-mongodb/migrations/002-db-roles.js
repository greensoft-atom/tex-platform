// migrations/002-db-roles.js — least-privilege role for the application user.
// The API/worker connects as a user holding only `texApp`; migrations run as a separate `texMigrator` user.
module.exports = {
  async up(db, client) {
    const admin = client.db('admin');
    const appDb = db.databaseName;                       // e.g. "tex"
    const privileges = [
      // Normal CRUD on business collections; no dropCollection, no createIndex, no collMod.
      { resource: { db: appDb, collection: '' }, actions: ['find', 'insert', 'update', 'remove'] },
      // Audit trail is append-only for the application: it can write and read, never change or delete.
      { resource: { db: 'tex_audit', collection: 'audit_events' }, actions: ['find', 'insert'] },
    ];
    const existing = await admin.command({ rolesInfo: 'texApp' });
    if (existing.roles.length === 0) {
      await admin.command({ createRole: 'texApp', privileges, roles: [] });
    } else {
      await admin.command({ updateRole: 'texApp', privileges, roles: [] });
    }
  },
  async down() {},
};
