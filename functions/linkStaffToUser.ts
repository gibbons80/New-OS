import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email.toLowerCase();
    const userId = user.id;

    console.log(`linkStaffToUser: Attempting to link for user email: ${userEmail}, user ID: ${userId}`);

    // Fetch all staff records to see what we have
    const allStaff = await base44.asServiceRole.entities.Staff.list();
    console.log(`linkStaffToUser: Total staff records in system: ${allStaff.length}`);

    // Find matching staff records (both linked and unlinked) by email
    const matchingStaff = allStaff.filter(staff => {
      const companyEmailLower = staff.company_email ? staff.company_email.toLowerCase() : null;
      const personalEmailLower = staff.personal_email ? staff.personal_email.toLowerCase() : null;
      return companyEmailLower === userEmail || personalEmailLower === userEmail;
    });

    console.log(`linkStaffToUser: Found ${matchingStaff.length} staff record(s) matching email ${userEmail}`);

    if (matchingStaff.length > 0) {
      for (const staff of matchingStaff) {
        // Link staff to user if not already linked
        if (!staff.user_id || staff.user_id === '' || staff.user_id === null || staff.user_id === 'null') {
          await base44.asServiceRole.entities.Staff.update(staff.id, {
            user_id: userId
          });
          console.log(`Linked staff ${staff.id} to user ${userId}`);
        } else {
          console.log(`Staff ${staff.id} already linked to user ${staff.user_id}`);
        }

        // Sync staff data to user profile
        const syncData = {};
        if (staff.preferred_name) syncData.full_name = staff.preferred_name;
        if (staff.profile_photo_url) syncData.profile_photo_url = staff.profile_photo_url;
        if (staff.personal_email) syncData.personal_email = staff.personal_email;
        if (staff.phone) syncData.phone = staff.phone;
        if (staff.address) syncData.address = staff.address;
        if (staff.bio) syncData.bio = staff.bio;
        if (staff.linkedin_link) syncData.linkedin_link = staff.linkedin_link;
        if (staff.facebook_link) syncData.facebook_link = staff.facebook_link;
        if (staff.instagram_link) syncData.instagram_link = staff.instagram_link;
        if (staff.tiktok_link) syncData.tiktok_link = staff.tiktok_link;
        if (staff.emergency_contact_name) syncData.emergency_contact_name = staff.emergency_contact_name;
        if (staff.emergency_contact_phone) syncData.emergency_contact_phone = staff.emergency_contact_phone;
        if (staff.emergency_contact_relationship) syncData.emergency_contact_relationship = staff.emergency_contact_relationship;
        if (staff.emergency_contact_email) syncData.emergency_contact_email = staff.emergency_contact_email;

        if (Object.keys(syncData).length > 0) {
          await base44.asServiceRole.entities.User.update(userId, syncData);
          console.log(`Synced staff data to user ${userId}`);
        }
      }

      return Response.json({ 
        success: true, 
        message: `Linked and synced ${matchingStaff.length} staff record(s)` 
      });
    }

    return Response.json({ 
      success: true, 
      message: 'No matching staff records found' 
    });

  } catch (error) {
    console.error('Error linking staff to user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});