// src/core/db/mongoose-settings.ts — global Mongoose 5.13 settings.
// Imported by schema-helpers (so by every model) and by connection.ts. They must be global and set before
// any model compiles: Mongoose reads autoIndex when a model is compiled, and a connection made with useDb()
// before connect() (the audit database) does not inherit the options passed to connect().
import mongoose from 'mongoose';

mongoose.set('useNewUrlParser', true);      // driver 3.x: current connection-string parser
mongoose.set('useUnifiedTopology', true);   // driver 3.x: current server discovery and monitoring
mongoose.set('useCreateIndex', true);       // createIndex instead of the deprecated ensureIndex
mongoose.set('useFindAndModify', false);    // native findOneAndUpdate instead of the deprecated findAndModify
mongoose.set('autoIndex', false);           // indexes are created by the release step (the app user cannot)
mongoose.set('autoCreate', false);          // collections and validators come from migrations
mongoose.set('bufferCommands', false);      // fail fast instead of queueing while the database is down
mongoose.set('strict', 'throw');            // unknown fields in documents are errors, not silently dropped
mongoose.set('strictQuery', 'throw');       // unknown filter paths are errors: { ownerOrgId: x } must not match all
mongoose.set('runValidators', true);        // schema validators also run on updateOne / findOneAndUpdate
mongoose.set('sanitizeProjection', true);   // user input cannot inject projections such as { password: 1 }

export default mongoose;
