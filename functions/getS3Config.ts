import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucket = Deno.env.get('AWS_S3_BUCKET_NAME');
    const region = Deno.env.get('AWS_REGION');

    return Response.json({ 
      bucket_name: bucket?.trim(),
      region: region?.trim()
    });
  } catch (error) {
    console.error('ERROR in getS3Config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});