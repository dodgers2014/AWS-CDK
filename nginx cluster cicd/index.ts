import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import cdk = require('@aws-cdk/core');
const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-integ-ecs');
// Create a cluster
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2 });
const cluster = new ecs.Cluster(stack, 'EcsCluster', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO)
});
// Create Task Definition
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDef');
const container = taskDefinition.addContainer('web', {
  image: ecs.ContainerImage.fromRegistry("nginx:latest"),
  memoryLimitMiB: 256
});
container.addPortMappings({
  containerPort: 80,
  hostPort: 0,
  protocol: ecs.Protocol.TCP
});
// Create Service
const service = new ecs.Ec2Service(stack, "Service", {
  cluster,
  taskDefinition,
});
// Create ALB
const lb = new elbv2.ApplicationLoadBalancer(stack, 'LB', {
  vpc,
  internetFacing: true
});
const listener = lb.addListener('PublicListener', { port: 80, open: true });
// Attach ALB to ECS Service
listener.addTargets('ECS', {
  port: 80,
  targets: [service.loadBalancerTarget({
    containerName: 'web',
    containerPort: 80
  })],
});
new cdk.CfnOutput(stack, 'LoadBalancerDNS', { value: lb.loadBalancerDnsName, });
app.synth();