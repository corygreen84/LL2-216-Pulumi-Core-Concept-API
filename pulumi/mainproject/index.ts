import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const org = pulumi.getOrganization();
const project = pulumi.getProject();
const env = pulumi.getStack();

// stack reference to VPC
const vpcStackRef = new pulumi.StackReference(`${org}/poc/${env}`);
const networkStackRef = new pulumi.StackReference(`${org}/networking/${env}`);

export const network = networkStackRef;

export const vpcId = vpcStackRef.getOutput("vpcId");
export const subnetIds = vpcStackRef.getOutput("vpcPublicSubnetIds");
// export const securityGroupIds = vpcStackRef.getOutput("defaultSecurityGroupId");

// Create the role for the Lambda to assume
const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Effect: "Allow",
          Sid: "",
        },
      ],
    },
  });
  
  // Attach the full access policy to the Lambda role
  const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("lambdaRoleAttachment", {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });
  
  // Create the Lambda to execute
  const lambda = new aws.lambda.Function("lambdaFunction", {
    code: new pulumi.asset.AssetArchive({
      ".": new pulumi.asset.FileArchive("./app"),
    }),
    runtime: "nodejs12.x",
    role: lambdaRole.arn,
    handler: "index.handler",
    // vpcConfig: {
    //     subnetIds,
    //     securityGroupIds,
    // }
    vpcConfig: {
        vpcId,
        subnetIds,
    }
  });

  // Set up the API Gateway
  const apiGW = new aws.apigatewayv2.Api("httpApiGateway", {
    protocolType: "HTTP",
    routeKey: "POST /",
    target: lambda.invokeArn,
  });
  
  // Give API Gateway permissions to invoke the Lambda
  const lambdaPermission = new aws.lambda.Permission("lambdaPermission", {
    action: "lambda:InvokeFunction",
    principal: "apigateway.amazonaws.com",
    function: lambda,
  }, {dependsOn: [ apiGW, lambda]});
  
  
  // exporting the api end point
  export const endpoint = apiGW.apiEndpoint;
  




