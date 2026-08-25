import{runSchedulerOnce}from'./lib/scheduler';import{prisma}from'./lib/db';runSchedulerOnce().then(r=>console.log(JSON.stringify(r))).finally(()=>prisma.$disconnect());
