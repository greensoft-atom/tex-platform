// src/core/db/int64.schema-type.ts — BSON Int64 ("long") for money in minor units.
// Mongoose 5 has no 64-bit integer type: a JS number above 2^31 is stored as a double.
// The community package mongoose-long silently truncates 300000.5 to 300000; this type rejects it.
import mongoose from 'mongoose';
import type { Long } from 'mongodb';

const MongoLong = mongoose.mongo.Long;
const INTEGER_STRING = /^-?\d{1,19}$/;

export class Int64 extends mongoose.SchemaType {
  static schemaName = 'Int64';

  constructor(path: string, options?: Record<string, unknown>) {
    super(path, options, 'Int64');
  }

  private get pathName(): string {
    return (this as unknown as { path: string }).path;      // set by SchemaType; missing from the 5.13 typings
  }

  checkRequired(value: unknown): boolean {
    return value != null;
  }

  /** Accepts a Long, a safe integer number, or a decimal integer string; anything else is a CastError. */
  cast(value: unknown): Long | null | undefined {
    if (value == null) return value as null | undefined;
    if (value instanceof MongoLong) return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return MongoLong.fromNumber(value);
    if (typeof value === 'string' && INTEGER_STRING.test(value)) {
      const long = MongoLong.fromString(value);
      const canonical = value.replace(/^(-?)0+(?=\d)/, '$1').replace(/^-0$/, '0');
      if (long.toString() === canonical) return long;      // Long.fromString wraps silently outside Int64
    }
    throw new mongoose.Error.CastError('Int64', value, this.pathName);
  }

  castForQuery(...args: unknown[]): unknown {
    if (args.length === 1) return this.cast(args[0]);
    const [operator, value] = args as [string, unknown];
    if (operator === '$in' || operator === '$nin') return (value as unknown[]).map((v) => this.cast(v));
    if (['$eq', '$ne', '$lt', '$lte', '$gt', '$gte'].includes(operator)) return this.cast(value);
    if (operator === '$exists') return Boolean(value);
    throw new Error(`Operator ${operator} is not supported for Int64 path ${this.pathName}`);
  }
}

// Register so that `{ type: Int64 }` resolves in schema definitions.
(mongoose.Schema.Types as unknown as Record<string, unknown>).Int64 = Int64;
