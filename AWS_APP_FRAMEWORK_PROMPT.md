# **Prompt for Amazon Q: AWS Application Accelerator Framework**

You are an expert AWS developer specializing in Infrastructure as Code and full-stack application development. Your task is to build the complete source code for a clonable "AWS Application Accelerator Framework". This framework must be built using the AWS CDK v2 with TypeScript.

Below are the detailed requirements for the framework you will create.

### **1\. High-Level Project Goal**

Create a GitHub-ready repository that allows developers to define backend APIs and data structures using simple JSON files (model.json). The framework's CDK code will parse these files and automatically provision all the necessary AWS infrastructure. The project must include a fully configured CI/CD pipeline, a starter frontend application, and comprehensive user documentation.

### **2\. Core Technology Stack**

* **IaC:** AWS CDK v2 (TypeScript)  
* **Backend API:** AWS AppSync (GraphQL)  
* **Authentication:** Amazon Cognito User Pools  
* **Databases:** Amazon DynamoDB (NoSQL) and Amazon Aurora Serverless v2 (SQL)  
* **SQL Migrations:** db-migrate  
* **CI/CD:** AWS CodePipeline & AWS CodeBuild  
* **Frontend:** Vue 3 with Vite  
* **UI & Styling:** Tailwind CSS and the @aws-amplify/ui-vue component library.  
* **Secrets:** AWS Secrets Manager  
* **Monitoring:** Amazon CloudWatch (Logs, Dashboards, Alarms) & AWS X-Ray  
* **Asynchronous Processing:** Amazon SQS

### **3\. CI/CD Pipeline Implementation**

Implement a multi-environment AWS CodePipeline with the following stages and logic:

1. **Source:** Connect to a GitHub repository (placeholder).  
2. **Build:** Install dependencies and synthesize the CDK application.  
3. **Deploy to dev:**  
   * Triggered automatically on every push to the develop branch.  
   * Deploy a stack named App-Dev.  
4. **Deploy to test:**  
   * Triggered automatically upon the successful completion of the dev deployment.  
   * Deploy a stack named App-Test.  
   * Run an E2E test suite against the test environment's API endpoint.  
5. **Deploy to prod:**  
   * Triggered on a push to the main branch.  
   * This stage **must include a manual approval step** in the CodePipeline console.  
   * Deploy a stack named App-Prod.

### **4\. Model-Driven Backend Logic**

This is the core of the framework. You will write CDK code that reads all .json files from a /models directory and generates the backend infrastructure.

#### **model.json Parsing Logic**

For each model.json file, your CDK code must perform the following actions:

1. **Generate GraphQL Schema:** Create GraphQL type, query, mutation, and (if enabled) subscription definitions based on the name and properties of the model.  
2. **Provision Data Source:**  
   * If dataSource.type is database and dataSource.engine is nosql, create a **DynamoDB table**.  
   * If dataSource.type is database and dataSource.engine is sql, create an **Aurora Serverless v2 cluster**.  
   * If dataSource.type is thirdPartyApi, create an **AppSync HTTP Data Source** pointing to the specified endpoint. Authentication credentials for this API **must** be retrieved from AWS Secrets Manager and configured on the data source.  
3. **Create AppSync Resolvers:**  
   * Generate the necessary resolvers to connect the GraphQL operations to the configured data source.  
   * Implement logic for relationships (hasMany, belongsTo).  
4. **Implement Subscriptions:** If "enableSubscriptions": true, generate the necessary mutation resolver logic to publish changes to subscribed clients.  
5. **Implement Access Control:**  
   * Configure the AppSync API to use **Amazon Cognito User Pools** as the default authorization mode.  
   * In the resolvers, implement logic that respects the accessControl rules. Check the user's group from the JWT against the allowed operations.  
   * Implement **owner-based security**. If a property has "isOwner": true, the resolver logic for update and delete operations must verify that the authenticated user's ID matches the value in that property.  
6. **Implement Custom Hooks:** If the hooks object is present, the AppSync resolver should be a **Pipeline Resolver**. The specified Lambda function (e.g., "afterCreate": "notify-followers-function") should be invoked at the correct point in the pipeline. Create placeholder Lambda functions for any hooks defined in the example models.  
7. **Implement Rate Limiting:**  
   * If dataSource.limits is defined for a thirdPartyApi, implement the asynchronous workflow.  
   * The AppSync resolver should not call the HTTP endpoint directly. Instead, it should put the request payload into an **SQS queue** and return a unique requestId.  
   * Create a **Lambda function** that polls this SQS queue and makes the actual call to the third-party API at the specified rate. This Lambda must be configured with the appropriate API credentials from AWS Secrets Manager.  
   * The client will use the requestId to get the result via a GraphQL subscription. Implement this subscription (onJobCompleted(requestId: ID\!)).

### **5\. Production-Ready Features**

In addition to the core logic, implement the following cross-cutting concerns:

* **Observability:**  
  * Enable **AWS X-Ray** tracing on the AppSync API and all Lambda functions.  
  * Create a default **CloudWatch Dashboard** showing API request counts, latency (p50, p90, p99), and 4xx/5xx error rates.  
  * Create a **CloudWatch Alarm** that triggers if the 5xx error rate exceeds 1% over a 5-minute period.  
* **Secrets Management:** The framework must enforce a strict secret management policy for third-party APIs. For any model defined with a thirdPartyApi data source, the CDK code must dynamically construct and retrieve the corresponding secret from **AWS Secrets Manager**. The secret name **must** follow this convention: ${appName}-${modelName}-${stage}-api-secret. For example, for a GeoData model in the dev stage of an app named MyTool, the secret name would be MyTool-GeoData-dev-api-secret. The CDK will then configure the AppSync HTTP Data Source or the rate-limiting Lambda with these credentials.  
* **Cost Management:** Provision an **AWS Budget** with a placeholder monthly limit that sends an SNS notification if exceeded.  
* **Data Management:**  
  * **Data Seeding:** Create a custom CDK construct that, during cdk deploy, scans the /models directory for \[modelName\].seed.json files. The script must insert the records from the JSON file into the correct database and then archive the file to prevent re-execution.  
  * **SQL Schema Migrations:** Implement a migration strategy for the Aurora database. During deployment, a CDK Custom Resource must trigger a Lambda function that runs db-migrate up. This function will apply any new SQL migration scripts located in a /migrations/sql directory.

### **6\. Frontend Starter Application**

Create a starter frontend application in a /frontend directory.

* **Framework:** Vue 3 \+ Vite.  
* **Styling:** Use Tailwind CSS for all styling.  
* **UI Kit:** Integrate the @aws-amplify/ui-vue library.  
* **Functionality:**  
  * Implement a full authentication flow (sign-up, sign-in, sign-out) using the Amplify UI components and a generated Cognito User Pool.  
  * Create a responsive **dashboard layout** with a static sidebar for navigation and a main content area.  
  * Create a sample page that makes a GraphQL query to the AppSync API to fetch data from one of the models and displays it.  
  * Pre-configure the AWS Amplify libraries to connect to the generated Cognito and AppSync resources.

### **7\. Project Documentation**

Generate a comprehensive README.md file in the root of the created repository. This file is for the developers who will *use* the framework. It must explain, at a minimum:

1. **What the framework is** and its core purpose.  
2. **How to get started:** cloning, installing dependencies, and running cdk deploy.  
3. **Core Concepts:** A detailed guide on how to define new data models using the model.json file structure. Provide examples for each major feature (relations, access control, hooks, etc.).  
4. **Managing Secrets:** A clear guide on how to add API keys for third-party models into AWS Secrets Manager using the required naming convention: ${appName}-${modelName}-${stage}-api-secret.  
5. **Database Migrations:** How to create a new SQL schema migration file in the /migrations/sql directory and how the deployment process applies it.  
6. **Local Development:** The recommended process for testing Lambda function logic locally.

Please provide the complete, well-structured, and commented code for this entire project, including the final user-facing README.md.