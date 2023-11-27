export default `
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Hono API
  license:
    name: MIT
servers:
  - url: https://sheet-manipulator.yawnxyz.workers.dev
paths:
  /configs:
    get:
      summary: Get configurations
      operationId: getConfigs
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: object
  /logs:
    get:
      summary: Get logs
      operationId: getLogs
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: object
  /add:
    get:
      summary: Add a row to the logs
      operationId: addRow
      parameters:
        - in: query
          name: User
          schema:
            type: string
          description: User Message text goes here
          required: false
        - in: query
          name: Assistant
          schema:
            type: string
          description: Assistant Message text goes here
          required: false
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: object
  /api:
    get:
      summary: Fetch all data
      operationId: fetchAll
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: object
  /openapi.yaml:
    get:
      summary: Get OpenAPI YAML
      operationId: getOpenApiYaml
      responses:
        '200':
          description: Successful operation
          content:
            text/yaml:
              schema:
                type: string
`