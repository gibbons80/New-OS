import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { input } = await req.json();

    if (!input || input.trim().length === 0) {
      return Response.json({ predictions: [] });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:us`
    );

    const data = await response.json();

    if (data.predictions) {
      const predictions = data.predictions.slice(0, 5).map(pred => ({
        description: pred.description,
        place_id: pred.place_id
      }));
      return Response.json({ predictions });
    }

    return Response.json({ predictions: [] });
  } catch (error) {
    console.error('Address autocomplete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});