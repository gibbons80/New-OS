import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { old_service_name, new_service_name } = await req.json();

    if (!old_service_name || !new_service_name) {
      return Response.json({ error: 'Missing old_service_name or new_service_name' }, { status: 400 });
    }

    const staffAuthorizations = await base44.asServiceRole.entities.StaffServiceAuthorization.filter({
      service_name: old_service_name
    });

    const updatePromises = staffAuthorizations.map(auth => {
      return base44.asServiceRole.entities.StaffServiceAuthorization.update(auth.id, {
        service_name: new_service_name
      });
    });

    await Promise.all(updatePromises);

    return Response.json({ 
      success: true,
      updated_count: updatePromises.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});