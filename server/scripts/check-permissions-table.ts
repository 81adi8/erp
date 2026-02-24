const { sequelize, connectDB } = require('../database/sequelize');

async function check() {
  await connectDB();
  
  try {
    // Check role_permissions table
    const tables = await sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'smoke_test_tenant_a' 
       AND table_name = 'role_permissions'`,
      { type: 'SELECT' }
    );
    console.log('role_permissions table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const columns = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'smoke_test_tenant_a' 
         AND table_name = 'role_permissions'`,
        { type: 'SELECT' }
      );
      console.log('Columns:', columns.map((c: any) => c.column_name));
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  
  await sequelize.close();
}

check();
