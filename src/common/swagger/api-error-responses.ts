import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const errorResponseSchema = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      example: 'Validation failed',
    },
    code: {
      type: 'string',
      example: 'BAD_REQUEST',
    },
    details: {
      type: 'object',
      example: {},
    },
  },
  required: ['message', 'code', 'details'],
};

export function ApiCommonErrorResponses(options?: {
  notFound?: boolean;
  conflict?: boolean;
}) {
  const decorators = [
    ApiBadRequestResponse({
      description: 'Invalid request payload or query parameters.',
      schema: errorResponseSchema,
    }),
    ApiUnauthorizedResponse({
      description: 'Missing, invalid, or expired access token.',
      schema: errorResponseSchema,
    }),
    ApiForbiddenResponse({
      description: 'Authenticated user does not have the required role.',
      schema: errorResponseSchema,
    }),
    ApiInternalServerErrorResponse({
      description: 'Unexpected server error.',
      schema: errorResponseSchema,
    }),
  ];

  if (options?.notFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Requested resource was not found.',
        schema: errorResponseSchema,
      }),
    );
  }

  if (options?.conflict) {
    decorators.push(
      ApiConflictResponse({
        description: 'Request conflicts with the current resource state.',
        schema: errorResponseSchema,
      }),
    );
  }

  return applyDecorators(...decorators);
}
