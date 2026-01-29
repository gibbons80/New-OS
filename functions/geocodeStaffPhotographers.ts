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
    // Try simplified address if first attempt fails
    if (data.status !== 'OK' && address) {
      const parts = address.split(',');
      if (parts.length > 2) {
        const simplifiedAddress = parts.slice(0, -1).join(',').trim();
        const retryResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(simplifiedAddress)}&key=${apiKey}`
        );
        const retryData = await retryResponse.json();
        if (retryData.status === 'OK' && retryData.results && retryData.results.length > 0) {
          const location = retryData.results[0].geometry.location;
          return { lat: location.lat, lng: location.lng };
        }
      }
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }
  return null;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get Google Maps API key
    const response = await base44.functions.invoke('getGoogleMapsKey');
    const apiKey = response.data.apiKey;

    if (!apiKey) {
      return Response.json({ error: 'Google Maps API key not found' }, { status: 500 });
    }

    // Fetch all staff photographers with addresses (in one query)
    const staff = await base44.asServiceRole.entities.Staff.filter({
      department: 'Photographer',
      employment_status: { $ne: 'terminated' }
    });
    
    const staffWithAddresses = staff.filter(s => s.address && !s.latitude && !s.longitude);

    let updated = 0;
    let failed = 0;

    // Process in smaller batches with longer delays to avoid rate limiting
    const batchSize = 2;
    for (let i = 0; i < staffWithAddresses.length; i += batchSize) {
      const batch = staffWithAddresses.slice(i, i + batchSize);
      
      // Geocode all addresses in batch
      const geocodePromises = batch.map(staffMember => 
        geocodeAddress(staffMember.address, apiKey).then(coords => ({ staffMember, coords }))
      );
      
      const results = await Promise.all(geocodePromises);
      
      // Update those with successful geocoding
      const updatePromises = results
        .filter(r => r.coords)
        .map(r => 
          base44.asServiceRole.entities.Staff.update(r.staffMember.id, {
            latitude: r.coords.lat,
            longitude: r.coords.lng
          })
        );
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        updated += updatePromises.length;
      }
      failed += batch.length - updatePromises.length;
      
      // Longer delay between batches
      if (i + batchSize < staffWithAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return Response.json({
      success: true,
      updated,
      failed,
      total: staffWithAddresses.length
    });
  } catch (error) {
    console.error('Error in geocodeStaffPhotographers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});