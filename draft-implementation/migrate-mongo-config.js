// migrate-mongo configuration. Run as tex_migrator: MONGO_URL must carry that user's credentials.
module.exports = {
  mongodb: {
    url: process.env.MONGO_URL,
    databaseName: process.env.MONGO_DB || 'tex',
    options: { useUnifiedTopology: true },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
};
