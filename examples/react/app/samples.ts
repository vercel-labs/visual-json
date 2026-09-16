import type { JsonValue, JsonSchema } from "@visual-json/core";

export type Sample = {
  name: string;
  filename: string;
  data: JsonValue;
  schema?: JsonSchema;
};

export const samples: Sample[] = [
  {
    name: "Schema widgets",
    filename: "widget-demo.json",
    data: {
      theme: "light",
      priority: "high",
      status: "open",
      active: true,
    },
    schema: {
      type: "object",
      properties: {
        theme: { type: "string", enum: ["light", "dark", "system"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        status: {
          type: "string",
          enum: ["open", "in_progress", "done", "cancelled"],
        },
        active: { type: "boolean" },
      },
    },
  },
  {
    name: "package.json",
    filename: "package.json",
    data: {
      name: "my-app",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "^15.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        typescript: "^5.6.0",
        eslint: "^9.0.0",
      },
      engines: { node: ">=18" },
    },
  },
  {
    name: "OpenAPI spec",
    filename: "openapi.json",
    data: {
      openapi: "3.1.0",
      info: {
        title: "Tasks API",
        version: "1.0.0",
        description: "A simple task management API",
        contact: { name: "API Support", email: "support@example.com" },
        license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
      },
      servers: [
        {
          url: "https://api.example.com/v1",
          description: "Production",
        },
        {
          url: "https://staging-api.example.com/v1",
          description: "Staging",
        },
      ],
      paths: {
        "/tasks": {
          get: {
            summary: "List tasks",
            operationId: "listTasks",
            tags: ["tasks"],
            parameters: [
              {
                name: "status",
                in: "query",
                required: false,
                schema: { type: "string", enum: ["open", "closed", "all"] },
              },
              {
                name: "limit",
                in: "query",
                required: false,
                schema: { type: "integer", default: 20, maximum: 100 },
              },
            ],
            responses: {
              "200": {
                description: "A list of tasks",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Task" },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: "Create a task",
            operationId: "createTask",
            tags: ["tasks"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TaskInput" },
                },
              },
            },
            responses: {
              "201": {
                description: "Task created",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
              "422": { description: "Validation error" },
            },
          },
        },
        "/tasks/{taskId}": {
          get: {
            summary: "Get a task",
            operationId: "getTask",
            tags: ["tasks"],
            parameters: [
              {
                name: "taskId",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": {
                description: "Task details",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
              "404": { description: "Task not found" },
            },
          },
          patch: {
            summary: "Update a task",
            operationId: "updateTask",
            tags: ["tasks"],
            parameters: [
              {
                name: "taskId",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TaskInput" },
                },
              },
            },
            responses: {
              "200": {
                description: "Task updated",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          delete: {
            summary: "Delete a task",
            operationId: "deleteTask",
            tags: ["tasks"],
            parameters: [
              {
                name: "taskId",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "204": { description: "Task deleted" },
            },
          },
        },
      },
      components: {
        schemas: {
          Task: {
            type: "object",
            required: ["id", "title", "status", "createdAt"],
            properties: {
              id: { type: "string", format: "uuid" },
              title: { type: "string", example: "Write docs" },
              description: { type: "string", nullable: true },
              status: {
                type: "string",
                enum: ["open", "in_progress", "closed"],
              },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              assignee: { type: "string", nullable: true },
              tags: { type: "array", items: { type: "string" } },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          TaskInput: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string", minLength: 1, maxLength: 200 },
              description: { type: "string", nullable: true },
              status: {
                type: "string",
                enum: ["open", "in_progress", "closed"],
              },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              assignee: { type: "string", nullable: true },
              tags: { type: "array", items: { type: "string" } },
            },
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  },
  {
    name: "json-render spec",
    filename: "spec.json",
    data: {
      root: "card_1",
      elements: {
        card_1: {
          type: "Card",
          props: { title: "User Profile" },
          children: ["stack_1"],
        },
        stack_1: {
          type: "Stack",
          props: { gap: 16 },
          children: ["avatar_1", "heading_1", "text_1", "button_group"],
        },
        avatar_1: {
          type: "Avatar",
          props: {
            src: "https://example.com/avatar.jpg",
            alt: "Jane Doe",
            size: "lg",
          },
        },
        heading_1: { type: "Heading", props: { level: 2, text: "Jane Doe" } },
        text_1: {
          type: "Text",
          props: { text: "Senior Software Engineer at Acme Corp." },
        },
        button_group: {
          type: "ButtonGroup",
          children: ["btn_edit", "btn_share"],
        },
        btn_edit: {
          type: "Button",
          props: { label: "Edit Profile", variant: "default" },
        },
        btn_share: {
          type: "Button",
          props: { label: "Share", variant: "outline" },
        },
      },
    },
  },
  {
    name: "json-render (nested)",
    filename: "dashboard.json",
    data: {
      type: "Stack",
      props: { direction: "vertical", gap: "lg" },
      state: {
        activeTab: "overview",
        notifications: true,
        darkMode: false,
        count: 42,
      },
      children: [
        {
          type: "Stack",
          props: { direction: "horizontal", gap: "md", align: "center" },
          children: [
            { type: "Heading", props: { text: "Dashboard", level: "h1" } },
            {
              type: "Text",
              props: { text: "Manage your workspace", variant: "muted" },
            },
          ],
        },
        {
          type: "Tabs",
          props: {
            tabs: [
              { label: "Overview", value: "overview" },
              { label: "Settings", value: "settings" },
            ],
            value: { $bindState: "/activeTab" },
          },
        },
        {
          type: "Stack",
          props: { direction: "vertical", gap: "md" },
          visible: [{ $state: "/activeTab", eq: "overview" }],
          children: [
            {
              type: "Grid",
              props: { columns: 3, gap: "md" },
              children: [
                {
                  type: "Card",
                  props: { title: "Active Users" },
                  children: [
                    {
                      type: "Metric",
                      props: { label: "Users", value: 1284, change: "+12%" },
                    },
                  ],
                },
                {
                  type: "Card",
                  props: { title: "Revenue" },
                  children: [
                    {
                      type: "Metric",
                      props: {
                        label: "Revenue",
                        value: "$48,200",
                        change: "+8.2%",
                      },
                    },
                  ],
                },
                {
                  type: "Card",
                  props: { title: "Orders" },
                  children: [
                    {
                      type: "Metric",
                      props: {
                        label: "Orders",
                        value: { $state: "/count" },
                        change: "-3%",
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "Card",
              props: { title: "Recent Activity" },
              children: [
                {
                  type: "Stack",
                  props: { direction: "vertical", gap: "sm" },
                  children: [
                    {
                      type: "Text",
                      props: {
                        text: "Alice deployed v2.4.0 to production",
                      },
                    },
                    {
                      type: "Text",
                      props: {
                        text: "Bob opened PR #312: Fix auth redirect",
                      },
                    },
                    {
                      type: "Text",
                      props: { text: "Carol added 3 new test cases" },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Card",
          props: { title: "Preferences" },
          visible: [{ $state: "/activeTab", eq: "settings" }],
          children: [
            {
              type: "Stack",
              props: { direction: "vertical", gap: "md" },
              children: [
                {
                  type: "Switch",
                  props: {
                    label: "Email notifications",
                    checked: { $bindState: "/notifications" },
                  },
                },
                {
                  type: "Switch",
                  props: {
                    label: "Dark mode",
                    checked: { $bindState: "/darkMode" },
                  },
                },
                {
                  type: "Button",
                  props: { label: "Save preferences", variant: "primary" },
                  on: { press: { action: "confetti" } },
                },
              ],
            },
          ],
        },
      ],
    },
  },
];
