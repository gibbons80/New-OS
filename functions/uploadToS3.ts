import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.709.0';

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
    const { source_url, folder, file_name, content_type } = JSON.parse(body);

    if (!source_url) {
      return Response.json({ error: 'No source_url provided' }, { status: 400 });
    }

    // Fetch the file from the source URL
    const fileResponse = await fetch(source_url);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from source URL');
    }
    const fileBuffer = await fileResponse.arrayBuffer();

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file_name ? file_name.split('.').pop() : 'bin';
    const s3Key = folder ? `${folder}/${timestamp}-${randomString}.${fileExtension}` : `${timestamp}-${randomString}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: Deno.env.get('AWS_S3_BUCKET_NAME').trim(),
      Key: s3Key,
      Body: new Uint8Array(fileBuffer),
      ContentType: content_type || 'application/octet-stream',
    });

    await s3Client.send(command);

    return Response.json({ 
      file_key: s3Key,
      file_name: file_name 
    });
  } catch (error) {
    console.error('ERROR in uploadToS3:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});