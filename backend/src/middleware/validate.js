import { ApiError } from '../utils/ApiError.js';

/**
 * Validates `req[source]` against a Zod schema. On success the parsed (and
 * coerced) value replaces the original so downstream handlers get clean data.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  req[source] = result.data;
  return next();
};
