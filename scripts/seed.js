const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nzfnijarcdlrxbbxluuy.supabase.co';
const supabaseKey = 'sb_publishable_5GQ7qZYk0KnQaaI5bORqBQ_clLP8NJ2';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function seed() {
  console.log('🚀 Starting Database Bootstrap Seeder...');
  
  // Test accounts definitions
  const managersToCreate = [
    { email: 'manager1@atomberg.com', password: 'Password123!', fullName: 'Amit Sharma', role: 'manager', department: 'Engineering' },
    { email: 'manager2@atomberg.com', password: 'Password123!', fullName: 'Sunita Patel', role: 'manager', department: 'Sales Operations' }
  ];

  const createdManagers = [];

  // 1. Create Managers first
  for (const mgr of managersToCreate) {
    console.log(`\nRegistering Manager: ${mgr.fullName} (${mgr.email})...`);
    
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', mgr.email)
      .maybeSingle();

    if (existing) {
      console.log(`Manager ${mgr.fullName} already exists with ID: ${existing.id}`);
      createdManagers.push({ id: existing.id, email: mgr.email, fullName: mgr.fullName });
      continue;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: mgr.email,
      password: mgr.password,
    });

    if (authError) {
      console.error(`Failed to sign up auth user for ${mgr.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`Auth account created! Inserting profile details...`);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: mgr.fullName,
        email: mgr.email,
        role: mgr.role,
        department: mgr.department,
        manager_id: null
      });

    if (profileError) {
      console.error(`Failed to insert profile for ${mgr.fullName}:`, profileError.message);
    } else {
      console.log(`Manager ${mgr.fullName} successfully registered!`);
      createdManagers.push({ id: userId, email: mgr.email, fullName: mgr.fullName });
    }

    // Wait a brief moment to prevent rate-limiting
    await wait(1000);
  }

  if (createdManagers.length === 0) {
    console.error('❌ Could not establish active managers. Aborting employee creation.');
    return;
  }

  const m1Id = createdManagers.find(m => m.email === 'manager1@atomberg.com')?.id || createdManagers[0].id;
  const m2Id = createdManagers.find(m => m.email === 'manager2@atomberg.com')?.id || createdManagers[0].id;

  const employeesToCreate = [
    { email: 'employee1@atomberg.com', password: 'Password123!', fullName: 'Rahul Verma', role: 'employee', department: 'Engineering', managerId: m1Id },
    { email: 'employee2@atomberg.com', password: 'Password123!', fullName: 'Vikram Singh', role: 'employee', department: 'Engineering', managerId: m1Id },
    { email: 'employee3@atomberg.com', password: 'Password123!', fullName: 'Priya Nair', role: 'employee', department: 'Sales Operations', managerId: m2Id }
  ];

  // 2. Create Employees linked to managers
  for (const emp of employeesToCreate) {
    console.log(`\nRegistering Employee: ${emp.fullName} (${emp.email}) reporting to manager...`);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emp.email)
      .maybeSingle();

    if (existing) {
      console.log(`Employee ${emp.fullName} already exists with ID: ${existing.id}`);
      continue;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emp.email,
      password: emp.password,
    });

    if (authError) {
      console.error(`Failed to sign up auth user for ${emp.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`Auth account created! Inserting profile details...`);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: emp.fullName,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        manager_id: emp.managerId
      });

    if (profileError) {
      console.error(`Failed to insert profile for ${emp.fullName}:`, profileError.message);
    } else {
      console.log(`Employee ${emp.fullName} successfully registered!`);
    }

    await wait(1000);
  }

  // 3. Create some dummy goals for testing visual charts and locks
  console.log('\nCreating sample goals for visual charts testing...');
  const activeEmployees = await supabase.from('profiles').select('id, full_name').eq('role', 'employee');
  
  if (activeEmployees.data) {
    for (const emp of activeEmployees.data) {
      // Check if goals already exist
      const { data: existingGoals } = await supabase.from('goals').select('id').eq('employee_id', emp.id);
      if (existingGoals && existingGoals.length > 0) {
        console.log(`Goals already exist for ${emp.full_name}, skipping goals seeding.`);
        continue;
      }

      console.log(`Seeding goals for ${emp.full_name}...`);
      const sampleGoals = [
        {
          employee_id: emp.id,
          thrust_area: 'Product Development',
          title: 'Core Architecture Delivery',
          description: 'Deliver the redesigned administrative panel and ensure typescript check passes.',
          uom_type: 'percentage',
          target: '100',
          weightage: 50,
          status: 'pending_approval',
          locked: false
        },
        {
          employee_id: emp.id,
          thrust_area: 'Operational Efficiency',
          title: 'Database Sync and Query Optimizations',
          description: 'Optimize Postgres queries to load hierarchy trees in under 200ms.',
          uom_type: 'numeric',
          target: '200',
          weightage: 50,
          status: 'pending_approval',
          locked: false
        }
      ];

      const { error: goalsError } = await supabase.from('goals').insert(sampleGoals);
      if (goalsError) {
        console.error(`Failed to seed goals for ${emp.full_name}:`, goalsError.message);
      } else {
        console.log(`Goals seeded for ${emp.full_name}!`);
      }
    }
  }

  console.log('\n🎉 Seeding completed successfully!');
  console.log('You can now log in using any of the registered accounts with password "Password123!"');
}

seed();
