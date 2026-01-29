import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    console.log('Starting linkAllStaffToUsers...');

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    console.log(`Found ${allUsers.length} users`);

    // Get all staff
    const allStaff = await base44.asServiceRole.entities.Staff.list();
    console.log(`Found ${allStaff.length} staff records`);

    let linkedCount = 0;
    let alreadyLinkedCount = 0;
    let notFoundCount = 0;

    for (const userRecord of allUsers) {
      const userEmail = userRecord.email.toLowerCase();
      const userId = userRecord.id;

      // Find matching staff records by email
      const matchingStaff = allStaff.filter(staff => {
        const companyEmailLower = staff.company_email ? staff.company_email.toLowerCase() : null;
        const personalEmailLower = staff.personal_email ? staff.personal_email.toLowerCase() : null;
        return companyEmailLower === userEmail || personalEmailLower === userEmail;
      });

      if (matchingStaff.length > 0) {
        for (const staff of matchingStaff) {
          // Link staff to user if not already linked
          if (!staff.user_id || staff.user_id === '' || staff.user_id === null || staff.user_id === 'null') {
            await base44.asServiceRole.entities.Staff.update(staff.id, {
              user_id: userId
            });
            console.log(`Linked staff ${staff.id} (${staff.preferred_name || staff.legal_full_name}) to user ${userId} (${userEmail})`);
            linkedCount++;
          } else {
            console.log(`Staff ${staff.id} already linked to user ${staff.user_id}`);
            alreadyLinkedCount++;
          }
        }
      } else {
        console.log(`No staff record found for user ${userEmail}`);
        notFoundCount++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Linked ${linkedCount} staff records. ${alreadyLinkedCount} were already linked. ${notFoundCount} users had no matching staff record.`,
      linkedCount,
      alreadyLinkedCount,
      notFoundCount
    });

  } catch (error) {
    console.error('Error linking all staff to users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});