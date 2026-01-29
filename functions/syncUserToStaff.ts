import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get updated user data from request body (if provided)
    const body = await req.json().catch(() => ({}));
    const updatedUserData = body.userData || {};

    const userId = user.id;
    const userEmail = user.email.toLowerCase();

    console.log(`syncUserToStaff: Syncing user ${userId} (${userEmail}) to staff records with data:`, updatedUserData);

    // Find staff records linked to this user OR matching by email
    const allStaff = await base44.asServiceRole.entities.Staff.list();
    
    const matchingStaff = allStaff.filter(staff => {
      const companyEmailLower = staff.company_email ? staff.company_email.toLowerCase() : null;
      const personalEmailLower = staff.personal_email ? staff.personal_email.toLowerCase() : null;
      const linkedToUser = staff.user_id === userId;
      const matchesByEmail = companyEmailLower === userEmail || personalEmailLower === userEmail;
      
      return linkedToUser || matchesByEmail;
    });

    console.log(`syncUserToStaff: Found ${matchingStaff.length} staff record(s) to sync`);

    if (matchingStaff.length > 0) {
      for (const staff of matchingStaff) {
        // Use provided userData if available, otherwise fall back to current user profile
        const sourceData = Object.keys(updatedUserData).length > 0 ? updatedUserData : user;
        
        // Build sync data from user profile (sync all fields, even if empty)
        const syncData = {
          preferred_name: sourceData.full_name || '',
          profile_photo_url: sourceData.profile_photo_url || '',
          personal_email: sourceData.personal_email || '',
          phone: sourceData.phone || '',
          address: sourceData.address || '',
          bio: sourceData.bio || '',
          linkedin_link: sourceData.linkedin_link || '',
          facebook_link: sourceData.facebook_link || '',
          instagram_link: sourceData.instagram_link || '',
          tiktok_link: sourceData.tiktok_link || '',
          emergency_contact_name: sourceData.emergency_contact_name || '',
          emergency_contact_phone: sourceData.emergency_contact_phone || '',
          emergency_contact_relationship: sourceData.emergency_contact_relationship || '',
          emergency_contact_email: sourceData.emergency_contact_email || ''
        };

        // Also link user_id if not already linked
        if (!staff.user_id || staff.user_id === '' || staff.user_id === null || staff.user_id === 'null') {
          syncData.user_id = userId;
        }

        await base44.asServiceRole.entities.Staff.update(staff.id, syncData);
        console.log(`Synced user data to staff ${staff.id}`);
      }

      return Response.json({ 
        success: true, 
        message: `Synced user profile to ${matchingStaff.length} staff record(s)` 
      });
    }

    return Response.json({ 
      success: true, 
      message: 'No matching staff records found' 
    });

  } catch (error) {
    console.error('Error syncing user to staff:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});