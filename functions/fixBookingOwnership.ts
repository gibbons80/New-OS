import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    console.log('Starting fixBookingOwnership...');

    // Get all bookings
    const allBookings = await base44.asServiceRole.entities.Booking.list();
    console.log(`Found ${allBookings.length} bookings`);

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    console.log(`Found ${allUsers.length} users`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const booking of allBookings) {
      const bookedById = booking.booked_by_id;
      const createdBy = booking.created_by;

      if (!bookedById) {
        console.log(`Booking ${booking.id} has no booked_by_id, skipping`);
        continue;
      }

      // Find the user by ID
      const user = allUsers.find(u => u.id === bookedById);
      
      if (!user) {
        console.log(`No user found for booked_by_id ${bookedById}`);
        continue;
      }

      // Check if created_by matches the user's email
      if (createdBy?.toLowerCase() === user.email?.toLowerCase()) {
        alreadyCorrect++;
        continue;
      }

      // Fix the created_by field
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        created_by: user.email
      });
      
      console.log(`Fixed booking ${booking.id}: ${createdBy} -> ${user.email}`);
      fixed++;
    }

    return Response.json({ 
      success: true, 
      message: `Fixed ${fixed} bookings. ${alreadyCorrect} were already correct.`,
      fixed,
      alreadyCorrect
    });

  } catch (error) {
    console.error('Error fixing booking ownership:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});