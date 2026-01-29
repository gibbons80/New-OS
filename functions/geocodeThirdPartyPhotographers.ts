import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get Google Maps API key
    const response = await base44.functions.invoke('getGoogleMapsKey');
    const apiKey = response.data.apiKey;

    if (!apiKey) {
      return Response.json({ error: 'Google Maps API key not found' }, { status: 400 });
    }

    // Get all third-party photographers
    const photographers = await base44.asServiceRole.entities.ThirdPartyPhotographer.list();
    
    let updated = 0;
    let failed = 0;
    const errors = [];

    // Geocode each photographer
    for (const photographer of photographers) {
      if (!photographer.full_address) {
        continue;
      }

      try {
        let geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(photographer.full_address)}&key=${apiKey}`
        );
        let data = await geocodeResponse.json();

        // If first attempt fails, try alternative approaches
        if (data.status !== 'OK' && photographer.full_address) {
          // Try removing state/zip if it's too specific
          const parts = photographer.full_address.split(',');
          if (parts.length > 2) {
            const simplifiedAddress = parts.slice(0, -1).join(',').trim();
            geocodeResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(simplifiedAddress)}&key=${apiKey}`
            );
            data = await geocodeResponse.json();
          }
        }

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          
          await base44.asServiceRole.entities.ThirdPartyPhotographer.update(
            photographer.id,
            {
              latitude: location.lat,
              longitude: location.lng
            }
          );
          
          updated++;
        } else {
          failed++;
          errors.push(`${photographer.company_name || 'Unknown'}: ${data.status || 'No results'} - Address: ${photographer.full_address}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${photographer.company_name || 'Unknown'}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      updated,
      failed,
      total: photographers.length,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});