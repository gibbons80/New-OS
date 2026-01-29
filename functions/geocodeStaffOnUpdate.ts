import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const geocodeAddress = async (address, apiKey) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }
  return null;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event } = body;

    if (!event || event.type !== 'update') {
      return Response.json({ success: false });
    }

    const { entity_name, entity_id } = event;

    // Only process Staff entity updates
    if (entity_name !== 'Staff') {
      return Response.json({ success: false });
    }

    // Get the updated staff record
    const staff = await base44.asServiceRole.entities.Staff.get(entity_id);

    if (!staff || !staff.address) {
      return Response.json({ success: false });
    }

    // Check if this is a photographer (by presence of address and active status)
    if (staff.employment_status === 'terminated') {
      return Response.json({ success: false });
    }

    // Get API key
    const apiKey = Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Geocode the address
    const coords = await geocodeAddress(staff.address, apiKey);

    if (coords) {
      await base44.asServiceRole.entities.Staff.update(entity_id, {
        latitude: coords.lat,
        longitude: coords.lng
      });

      return Response.json({
        success: true,
        lat: coords.lat,
        lng: coords.lng
      });
    }

    return Response.json({ success: false, reason: 'Geocoding failed' });
  } catch (error) {
    console.error('Error in geocodeStaffOnUpdate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});