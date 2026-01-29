import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staff_id, company_email, departments } = await req.json();

    if (!staff_id || !company_email) {
      return Response.json({ error: 'Missing staff_id or company_email' }, { status: 400 });
    }

    console.log(`Inviting staff ${staff_id} with email ${company_email}`);

    // Send invite to the company email
    await base44.users.inviteUser(company_email, 'user');

    // Fetch the newly created user
    const users = await base44.asServiceRole.entities.User.filter({ email: company_email });
    const newUser = users[0];

    if (!newUser) {
      return Response.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    console.log(`User created with ID ${newUser.id}`);

    // Update user with pre-assigned departments
    if (departments && departments.length > 0) {
      await base44.asServiceRole.entities.User.update(newUser.id, { 
        departments: departments 
      });
      console.log(`Assigned departments to user: ${departments.join(', ')}`);
    }

    // Link staff record to user
    await base44.asServiceRole.entities.Staff.update(staff_id, { 
      user_id: newUser.id 
    });

    console.log(`Linked Staff ${staff_id} to User ${newUser.id}`);

    return Response.json({ 
      success: true, 
      user_id: newUser.id,
      message: `Invited ${company_email} and assigned ${departments?.length || 0} app(s)`
    });

  } catch (error) {
    console.error('Error inviting staff to user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});