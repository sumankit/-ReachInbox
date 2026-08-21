/**
 * Hand-written OpenAPI 3.0 spec, served at /docs via swagger-ui-express.
 * Not required by the assignment spec, but makes the API testable from the
 * browser without needing Postman or a hand-crafted JWT.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ReachInbox Email Scheduler API",
    version: "1.0.0",
    description:
      "Schedules and sends cold-email campaigns via BullMQ delayed jobs + Ethereal SMTP. " +
      "All routes except /health require a Bearer JWT — sign in on the frontend " +
      "(http://localhost:3000), then copy `session.backendToken` (e.g. from the Network tab " +
      "or by logging it) and paste it into the 'Authorize' button below.",
  },
  servers: [{ url: "http://localhost:4000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      EmailJob: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          recipient: { type: "string", format: "email" },
          subject: { type: "string" },
          scheduledAt: { type: "string", format: "date-time" },
          sentAt: { type: "string", format: "date-time", nullable: true },
          status: { type: "string", enum: ["SCHEDULED", "PROCESSING", "SENT", "FAILED"] },
          error: { type: "string", nullable: true },
          sender: {
            type: "object",
            properties: { email: { type: "string" }, name: { type: "string" } },
          },
        },
      },
      Sender: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Health check (no auth required)",
        security: [],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/campaigns": {
      post: {
        summary: "Schedule a new email campaign",
        description:
          "Accepts multipart/form-data with a leads file, or JSON with a `recipients` array.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["subject", "body", "startTime", "leadsFile"],
                properties: {
                  subject: { type: "string" },
                  body: { type: "string" },
                  startTime: { type: "string", format: "date-time" },
                  delayMs: { type: "integer", default: 2000 },
                  hourlyLimit: { type: "integer", default: 200 },
                  leadsFile: { type: "string", format: "binary" },
                },
              },
            },
            "application/json": {
              schema: {
                type: "object",
                required: ["subject", "body", "startTime", "recipients"],
                properties: {
                  subject: { type: "string" },
                  body: { type: "string" },
                  startTime: { type: "string", format: "date-time" },
                  delayMs: { type: "integer", default: 2000 },
                  hourlyLimit: { type: "integer", default: 200 },
                  recipients: { type: "array", items: { type: "string", format: "email" } },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Campaign scheduled",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    campaignId: { type: "string" },
                    recipientCount: { type: "integer" },
                    senderCount: { type: "integer" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error / no valid recipients" },
          "401": { description: "Missing or invalid bearer token" },
        },
      },
    },
    "/api/emails": {
      get: {
        summary: "List email jobs",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["scheduled", "sent"], default: "scheduled" },
            description: "'scheduled' returns SCHEDULED/PROCESSING; 'sent' returns SENT/FAILED.",
          },
        ],
        responses: {
          "200": {
            description: "Email jobs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobs: { type: "array", items: { $ref: "#/components/schemas/EmailJob" } },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid bearer token" },
        },
      },
    },
    "/api/senders": {
      get: {
        summary: "List configured Ethereal senders",
        responses: {
          "200": {
            description: "Senders",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    senders: { type: "array", items: { $ref: "#/components/schemas/Sender" } },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid bearer token" },
        },
      },
    },
  },
};
