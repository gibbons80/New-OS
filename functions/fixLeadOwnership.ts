import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    console.log('Starting fixLeadOwnership...');

    // Get all leads
    const allLeads = await base44.asServiceRole.entities.Lead.list();
    console.log(`Found ${allLeads.length} leads`);

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    console.log(`Found ${allUsers.length} users`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const lead of allLeads) {
      const ownerId = lead.owner_id;
      const createdBy = lead.created_by;

      if (!ownerId) {
        console.log(`Lead ${lead.id} has no owner_id, skipping`);
        continue;
      }

      // Find the user by ID
      const user = allUsers.find(u => u.id === ownerId);
      
      if (!user) {
        console.log(`No user found for owner_id ${ownerId}`);
        continue;
      }

      // Check if created_by matches the user's email
      if (createdBy?.toLowerCase() === user.email?.toLowerCase()) {
        alreadyCorrect++;
        continue;
      }

      // Fix the created_by field
      await base44.asServiceRole.entities.Lead.update(lead.id, {
        created_by: user.email
      });
      
      console.log(`Fixed lead ${lead.id}: ${createdBy} -> ${user.email}`);
      fixed++;
    }

    return Response.json({ 
      success: true, 
      message: `Fixed ${fixed} leads. ${alreadyCorrect} were already correct.`,
      fixed,
      alreadyCorrect
    });

  } catch (error) {
    console.error('Error fixing lead ownership:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});