import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    
    // Get all existing staff
    const existingStaff = await base44.asServiceRole.entities.Staff.list();
    const existingUserIds = new Set(existingStaff.map(s => s.user_id).filter(Boolean));

    // Find users without staff records
    const usersNeedingStaff = users.filter(u => !existingUserIds.has(u.id));

    if (usersNeedingStaff.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'All users already have staff records',
        count: 0
      });
    }

    // Create staff records for users
    const newStaffRecords = usersNeedingStaff.map(u => ({
      user_id: u.id,
      legal_full_name: u.full_name,
      preferred_name: u.full_name,
      email: u.email,
      company_email: u.email,
      profile_photo_url: u.profile_photo_url || null,
      employment_status: 'active',
      worker_type: 'w2_employee',
      primary_role: 'Team Member',
      pay_type: 'salary',
      current_salary: 0,
      timezone: 'America/New_York',
      start_date: new Date().toISOString().split('T')[0]
    }));

    // Bulk create staff records
    await base44.asServiceRole.entities.Staff.bulkCreate(newStaffRecords);

    return Response.json({ 
      success: true, 
      message: `Created ${newStaffRecords.length} staff records`,
      count: newStaffRecords.length,
      users: newStaffRecords.map(s => s.preferred_name)
    });

  } catch (error) {
    console.error('Error syncing users to staff:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});