import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    console.log('Starting fixActivityOwnership...');

    // Get all activities
    const allActivities = await base44.asServiceRole.entities.Activity.list();
    console.log(`Found ${allActivities.length} activities`);

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    console.log(`Found ${allUsers.length} users`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const activity of allActivities) {
      const performedById = activity.performed_by_id;
      const createdBy = activity.created_by;

      if (!performedById) {
        console.log(`Activity ${activity.id} has no performed_by_id, skipping`);
        continue;
      }

      // Find the user by ID
      const user = allUsers.find(u => u.id === performedById);
      
      if (!user) {
        console.log(`No user found for performed_by_id ${performedById}`);
        continue;
      }

      // Check if created_by matches the user's email
      if (createdBy?.toLowerCase() === user.email?.toLowerCase()) {
        alreadyCorrect++;
        continue;
      }

      // Fix the created_by field
      await base44.asServiceRole.entities.Activity.update(activity.id, {
        created_by: user.email
      });
      
      console.log(`Fixed activity ${activity.id}: ${createdBy} -> ${user.email}`);
      fixed++;
    }

    return Response.json({ 
      success: true, 
      message: `Fixed ${fixed} activities. ${alreadyCorrect} were already correct.`,
      fixed,
      alreadyCorrect
    });

  } catch (error) {
    console.error('Error fixing activity ownership:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});