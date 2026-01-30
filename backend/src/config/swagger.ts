import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FluxERP API',
      version: '1.0.0',
      description: `
## FluxERP API Documentation

FluxERP is a comprehensive Enterprise Resource Planning system for manufacturing operations, featuring:

- **Product Management**: Create and manage products with SKU tracking
- **Bill of Materials (BOM)**: Define product structures and components
- **Engineering Change Orders (ECO)**: Track and approve product changes with versioning
- **Work Orders**: Manage production schedules and track progress
- **AI-Powered Analysis**: Get intelligent insights using Gemini AI

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting

- General endpoints: 100 requests/minute
- AI endpoints: 10 requests/minute
- Auth endpoints: 5 requests/minute
      `,
      contact: {
        name: 'FluxERP Support',
        email: 'support@fluxerp.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server',
      },
      {
        url: 'https://api.fluxerp.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
          required: ['error'],
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            total: {
              type: 'integer',
            },
            totalPages: {
              type: 'integer',
            },
          },
        },
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            role: {
              $ref: '#/components/schemas/Role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@fluxerp.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 6,
              example: 'password123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT token for authentication',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 6,
            },
            name: {
              type: 'string',
              minLength: 2,
            },
            roleId: {
              type: 'string',
              format: 'uuid',
              description: 'Optional role ID, defaults to Viewer role',
            },
          },
        },
        // Product schemas
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            sku: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            category: {
              type: 'string',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'discontinued'],
            },
            unitPrice: {
              type: 'number',
              format: 'decimal',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['name', 'sku'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 200,
              example: 'Widget Pro',
            },
            sku: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'WGT-PRO-001',
            },
            description: {
              type: 'string',
              maxLength: 1000,
            },
            category: {
              type: 'string',
              maxLength: 100,
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'discontinued'],
              default: 'active',
            },
            unitPrice: {
              type: 'number',
              minimum: 0,
            },
          },
        },
        // BOM schemas
        BOM: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            product: {
              $ref: '#/components/schemas/Product',
            },
            version: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'obsolete'],
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BOMItem',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        BOMItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            partNumber: {
              type: 'string',
            },
            partName: {
              type: 'string',
            },
            quantity: {
              type: 'number',
            },
            unit: {
              type: 'string',
            },
            unitCost: {
              type: 'number',
              nullable: true,
            },
          },
        },
        CreateBOMRequest: {
          type: 'object',
          required: ['name', 'productId'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              example: 'Widget Pro BOM v1',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            version: {
              type: 'string',
              default: '1.0',
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'obsolete'],
              default: 'draft',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['partNumber', 'partName', 'quantity', 'unit'],
                properties: {
                  partNumber: { type: 'string' },
                  partName: { type: 'string' },
                  quantity: { type: 'number', minimum: 0 },
                  unit: { type: 'string' },
                  unitCost: { type: 'number', minimum: 0 },
                },
              },
            },
          },
        },
        // ECO schemas
        ECO: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            ecoNumber: {
              type: 'string',
              description: 'Auto-generated ECO number',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            reason: {
              type: 'string',
              nullable: true,
            },
            type: {
              type: 'string',
              enum: ['standard', 'emergency', 'deviation'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            status: {
              type: 'string',
              enum: ['draft', 'pending_review', 'in_review', 'approved', 'rejected', 'implemented'],
            },
            version: {
              type: 'integer',
              description: 'Version number for tracking changes',
            },
            isLatest: {
              type: 'boolean',
              description: 'Whether this is the latest version',
            },
            productId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            product: {
              $ref: '#/components/schemas/Product',
            },
            createdBy: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateECORequest: {
          type: 'object',
          required: ['title', 'description', 'type', 'priority'],
          properties: {
            title: {
              type: 'string',
              minLength: 3,
              maxLength: 200,
              example: 'Update motor specifications',
            },
            description: {
              type: 'string',
              minLength: 10,
              example: 'Change motor voltage from 12V to 24V for improved performance',
            },
            reason: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['standard', 'emergency', 'deviation'],
              default: 'standard',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: 'medium',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            bomId: {
              type: 'string',
              format: 'uuid',
            },
            proposedChanges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  oldValue: { type: 'string' },
                  newValue: { type: 'string' },
                },
              },
            },
          },
        },
        // Work Order schemas
        WorkOrder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            orderNumber: {
              type: 'string',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            product: {
              $ref: '#/components/schemas/Product',
            },
            bomId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            bom: {
              $ref: '#/components/schemas/BOM',
            },
            quantity: {
              type: 'integer',
            },
            status: {
              type: 'string',
              enum: ['planned', 'in_progress', 'completed', 'cancelled'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            progress: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
            },
            scheduledStart: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            scheduledEnd: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateWorkOrderRequest: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: {
              type: 'string',
              format: 'uuid',
            },
            bomId: {
              type: 'string',
              format: 'uuid',
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              example: 100,
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: 'medium',
            },
            scheduledStart: {
              type: 'string',
              format: 'date-time',
            },
            scheduledEnd: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // AI schemas
        AIAnalysisRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              minLength: 10,
              example: 'Analyze this ECO for potential risks',
            },
            context: {
              type: 'object',
              description: 'Additional context for the AI',
            },
          },
        },
        AIAnalysisResponse: {
          type: 'object',
          properties: {
            analysis: {
              type: 'string',
            },
            suggestions: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            processingTime: {
              type: 'number',
            },
          },
        },
        // Supplier schemas
        Supplier: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            contactEmail: {
              type: 'string',
              format: 'email',
              nullable: true,
            },
            contactPhone: {
              type: 'string',
              nullable: true,
            },
            address: {
              type: 'string',
              nullable: true,
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Health check
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded', 'error'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
            },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: [{ field: 'email', message: 'Invalid email format' }],
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'You do not have permission to perform this action',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        Conflict: {
          description: 'Conflict - Resource already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Resource already exists',
                code: 'CONFLICT',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Too many requests, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
              },
            },
          },
        },
        InternalError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and system status endpoints',
      },
      {
        name: 'Auth',
        description: 'Authentication and user management',
      },
      {
        name: 'Products',
        description: 'Product catalog management',
      },
      {
        name: 'BOMs',
        description: 'Bill of Materials management',
      },
      {
        name: 'ECOs',
        description: 'Engineering Change Order management with version control',
      },
      {
        name: 'Work Orders',
        description: 'Production work order management',
      },
      {
        name: 'Suppliers',
        description: 'Supplier management',
      },
      {
        name: 'AI',
        description: 'AI-powered analysis and insights',
      },
      {
        name: 'Analytics',
        description: 'Dashboard and reporting endpoints',
      },
    ],
  },
  apis: ['./src/docs/*.yaml', './src/docs/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Swagger UI options
  const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FluxERP API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  };

  // Serve swagger.json
  app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
}

export { swaggerSpec };
