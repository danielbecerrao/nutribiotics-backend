import * as Joi from 'joi';

const tokenTtlPattern = /^\d+[smhd]$/;
const postgresUrlPattern = /^postgres(ql)?:\/\/.+/;

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().pattern(postgresUrlPattern).required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().pattern(tokenTtlPattern).required(),
  JWT_REFRESH_TTL: Joi.string().pattern(tokenTtlPattern).required(),
  EMAIL_PROVIDER: Joi.string().valid('console').default('console'),
  EMAIL_FROM: Joi.string().email().default('noreply@nutribiotics.local'),
  APP_ORIGIN: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
});
