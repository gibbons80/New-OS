import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};

const geocodeCity = async (city) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { csv_file_url, column_mappings, service_mappings } = await req.json();

    if (!csv_file_url || !column_mappings) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch and parse CSV
    const response = await fetch(csv_file_url);
    const text = await response.text();
    const rows = text.split('\n').filter(row => row.trim());
    const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Create photographers from CSV data
    const photographers = [];
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        const cells = rows[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const photographerData = { department: 'customer_service' };

        // Map columns to fields
        headers.forEach((header, idx) => {
          const field = column_mappings[header];
          if (field && cells[idx]) {
            if (field === 'services_offered') {
              // Parse comma-separated services and map them
              const csvServices = cells[idx].split(',').map(s => s.trim()).filter(Boolean);
              const mappedServices = [];
              
              csvServices.forEach(csvService => {
                if (service_mappings && service_mappings[csvService]) {
                  mappedServices.push(...service_mappings[csvService]);
                }
              });
              
              photographerData[field] = [...new Set(mappedServices)]; // Remove duplicates
            } else {
              photographerData[field] = cells[idx];
            }
          }
        });

        // Ensure required field exists
        if (!photographerData.company_name) {
          errors.push({ row: i + 1, error: 'Missing company_name' });
          continue;
        }

        // Geocode location for map display
        if (photographerData.full_address) {
          const coords = await geocodeAddress(photographerData.full_address);
          if (coords) {
            photographerData.latitude = coords.latitude;
            photographerData.longitude = coords.longitude;
          }
        } else if (photographerData.city) {
          const coords = await geocodeCity(photographerData.city);
          if (coords) {
            photographerData.latitude = coords.latitude;
            photographerData.longitude = coords.longitude;
          }
        }

        photographers.push(photographerData);
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    // Bulk create photographers
    let imported_count = 0;
    if (photographers.length > 0) {
      try {
        await base44.asServiceRole.entities.ThirdPartyPhotographer.bulkCreate(photographers);
        imported_count = photographers.length;
      } catch (error) {
        return Response.json({ 
          error: 'Bulk create failed: ' + error.message,
          imported_count: 0,
          errors 
        }, { status: 500 });
      }
    }

    return Response.json({
      imported_count,
      total_rows: rows.length - 1,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});