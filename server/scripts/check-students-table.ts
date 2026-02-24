const { sequelize, connectDB } = require('../database/sequelize');

async function check() {
  await connectDB();
  
  const columns = await sequelize.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'smoke_test_tenant_a' AND table_name = 'students'`,
    { type: 'SELECT' }
  );
  
  console.log('Students table columns:');
  columns.forEach((c: any) => console.log('  ' + c.column_name));
  
  await sequelize.close();
}

check();
