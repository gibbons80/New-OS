import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.709.0';

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

    const body = await req.text();
    const { file_key } = JSON.parse(body);

    if (!file_key) {
      return Response.json({ error: 'No file_key provided' }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: Deno.env.get('AWS_S3_BUCKET_NAME').trim(),
      Key: file_key,
    });

    await s3Client.send(command);

    return Response.json({ success: true });
  } catch (error) {
    console.error('ERROR in deleteFromS3:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});