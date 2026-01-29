import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3.709.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.709.0';

const s3Client = new S3Client({
  region: Deno.env.get('AWS_REGION'),
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_key, force_download } = await req.json();

    if (!file_key) {
      return Response.json({ error: 'No file_key provided' }, { status: 400 });
    }

    // Validate AWS credentials are present
    const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME');
    const region = Deno.env.get('AWS_REGION');
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      console.error('Missing AWS credentials:', {
        hasBucket: !!bucketName,
        hasRegion: !!region,
        hasAccessKey: !!accessKeyId,
        hasSecretKey: !!secretAccessKey
      });
      return Response.json({ error: 'AWS credentials not configured' }, { status: 500 });
    }

    const commandParams = {
      Bucket: bucketName.trim(),
      Key: file_key,
    };

    if (force_download) {
      const fileName = file_key.split('/').pop();
      commandParams.ResponseContentDisposition = `attachment; filename="${fileName}"`;
    }

    const command = new GetObjectCommand(commandParams);

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return Response.json({ signed_url: signedUrl });
  } catch (error) {
    console.error('ERROR in getSignedUrl:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: error.message || 'Failed to generate signed URL',
      details: error.toString()
    }, { status: 500 });
  }
});